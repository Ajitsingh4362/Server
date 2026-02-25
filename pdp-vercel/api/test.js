// api/test.js — Test Bright Data connection
const http  = require('http');
const https = require('https');
const url   = require('url');

const BD_HOST = process.env.BD_HOST || 'brd.superproxy.io';
const BD_PORT = parseInt(process.env.BD_PORT || '22225');
const BD_USER = process.env.BD_USER || '';
const BD_PASS = process.env.BD_PASS || '';

function quickFetch(targetURL) {
  return new Promise((resolve, reject) => {
    if (!BD_USER || !BD_PASS) return reject(new Error('Credentials not set'));
    const parsed  = url.parse(targetURL);
    const authB64 = Buffer.from(`${BD_USER}:${BD_PASS}`).toString('base64');

    const proxyReq = http.request({
      host: BD_HOST, port: BD_PORT, method: 'CONNECT',
      path: `${parsed.hostname}:443`,
      headers: { 'Proxy-Authorization': `Basic ${authB64}`, 'Host': parsed.hostname },
      timeout: 12000,
    });

    proxyReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) { socket.destroy(); return reject(new Error(`CONNECT ${res.statusCode}`)); }
      const req = https.request({
        host: parsed.hostname, port: 443, path: parsed.path || '/',
        method: 'GET', socket, agent: false, rejectUnauthorized: false, timeout: 10000,
        headers: { 'Host': parsed.hostname, 'User-Agent': 'curl/8.0', 'Accept': '*/*' },
      });
      req.on('response', resp => {
        let body = '';
        resp.setEncoding('utf8');
        resp.on('data', c => body += c);
        resp.on('end', () => resolve({ status: resp.statusCode, body }));
        resp.on('error', reject);
      });
      req.on('error', reject);
      req.end();
    });
    proxyReq.on('error', reject);
    proxyReq.on('timeout', () => { proxyReq.destroy(); reject(new Error('Timeout')); });
    proxyReq.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (!BD_USER || !BD_PASS) {
    res.status(503).json({ ok: false, error: 'BD_USER / BD_PASS not set in Vercel Environment Variables' });
    return;
  }

  try {
    const result = await quickFetch('https://httpbin.org/ip');
    const json   = JSON.parse(result.body);
    res.json({ ok: true, ip: json.origin, user: BD_USER.split(':')[0], host: BD_HOST, port: BD_PORT });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
};
