// api/status.js — Check if BD is configured
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const configured = !!(process.env.BD_USER && process.env.BD_PASS);
  res.json({
    ok:         true,
    configured,
    host:       process.env.BD_HOST || 'brd.superproxy.io',
    port:       process.env.BD_PORT || '22225',
    userHint:   process.env.BD_USER ? process.env.BD_USER.replace(/:.+$/, '') : '',
    zone:       process.env.BD_ZONE || 'residential',
  });
};
