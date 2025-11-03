const fs = require('fs');
const path = require('path');

function readSpec(p) {
  const raw = fs.readFileSync(p, 'utf8');
  try { return JSON.parse(raw); } catch { return {}; }
}
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function w(p, content) {
  ensureDir(require('path').dirname(p));
  fs.writeFileSync(p, content, 'utf8');
}
function titleSlug(t='spec') {
  return t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

module.exports = { readSpec, ensureDir, w, titleSlug };
