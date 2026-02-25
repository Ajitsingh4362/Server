// api/fetch.js — Vercel Serverless Function
// Fetches any URL via Bright Data proxy
// Env vars needed: BD_HOST, BD_PORT, BD_USER, BD_PASS

const http  = require('http');
const https = require('https');
const url   = require('url');

const BD_HOST = process.env.BD_HOST || 'brd.superproxy.io';
const BD_PORT = parseInt(process.env.BD_PORT || '22225');
const BD_USER = process.env.BD_USER || '';
const BD_PASS = process.env.BD_PASS || '';

function fetchViaBD(targetURL, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    if (!BD_USER || !BD_PASS) return reject(new Error('BD_USER / BD_PASS env vars not set'));

    const parsed   = url.parse(targetURL);
    const isHTTPS  = parsed.protocol === 'https:';
    const authB64  = Buffer.from(`${BD_USER}:${BD_PASS}`).toString('base64');

    // Step 1: CONNECT tunnel through BD proxy
    const connectOpts = {
      host:    BD_HOST,
      port:    BD_PORT,
      method:  'CONNECT',
      path:    `${parsed.hostname}:${isHTTPS ? 443 : 80}`,
      headers: {
        'Proxy-Authorization': `Basic ${authB64}`,
        'Host': parsed.hostname,
      },
      timeout: 20000,
    };

    const proxyReq = http.request(connectOpts);
    proxyReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        return reject(new Error(`BD CONNECT failed: ${res.statusCode} ${res.statusMessage}`));
      }

      // Step 2: Make real request through tunnel
      const reqOpts = {
        host:               parsed.hostname,
        port:               isHTTPS ? 443 : 80,
        path:               parsed.path || '/',
        method:             'GET',
        socket,
        agent:              false,
        rejectUnauthorized: false,
        timeout:            25000,
        headers: {
          'Host':            parsed.hostname,
          'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
          'Cache-Control':   'no-cache',
          'Connection':      'close',
        },
      };

      const lib = isHTTPS ? https : http;
      const req = lib.request(reqOpts);
      req.setTimeout(25000, () => { req.destroy(); reject(new Error('Request timeout')); });

      req.on('response', resp => {
        // Handle redirects
        if ([301,302,303,307,308].includes(resp.statusCode) && resp.headers.location) {
          const loc    = resp.headers.location;
          const newURL = loc.startsWith('http') ? loc
            : `${parsed.protocol}//${parsed.hostname}${loc}`;
          socket.destroy();
          return fetchViaBD(newURL, redirectCount + 1).then(resolve).catch(reject);
        }

        let body = '';
        resp.setEncoding('utf8');
        resp.on('data',  chunk => { body += chunk; if (body.length > 6 * 1024 * 1024) req.destroy(); });
        resp.on('end',   ()    => resolve({ status: resp.statusCode, body }));
        resp.on('error', reject);
      });

      req.on('error', reject);
      req.end();
    });

    proxyReq.on('timeout', () => { proxyReq.destroy(); reject(new Error('Proxy connect timeout')); });
    proxyReq.on('error',   reject);
    proxyReq.end();
  });
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const targetURL = req.query.url;
  if (!targetURL) {
    res.status(400).json({ ok: false, error: 'Missing ?url= param' });
    return;
  }

  // Basic security — only allow http/https
  if (!/^https?:\/\//i.test(targetURL)) {
    res.status(400).json({ ok: false, error: 'Invalid URL' });
    return;
  }

  if (!BD_USER || !BD_PASS) {
    res.status(503).json({ ok: false, error: 'BD credentials not configured in Vercel env vars' });
    return;
  }

  try {
    const result = await fetchViaBD(targetURL);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(result.body);
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
};
