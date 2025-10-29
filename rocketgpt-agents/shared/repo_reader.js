/**
 * Tiny repo context: detect .sln, project names, basic language hints.
 * In production, expand to AST map, route tables, etc.
 */
const fs = require('fs');
const path = require('path');

function repoContext() {
  const files = fs.readdirSync('.', { withFileTypes: true });
  const hasSln = files.some(f => f.isFile() && f.name.endsWith('.sln'));
  const sln = hasSln ? files.find(f => f.name.endsWith('.sln')).name : null;

  // Heuristic project paths
  const admin = fs.existsSync('LicenseManager.Admin') ? 'LicenseManager.Admin' : null;
  const sdk = fs.existsSync('LicenseManager.SDK') ? 'LicenseManager.SDK' : null;

  return {
    solution: sln,
    projects: { admin, sdk },
    languages: detectLanguages('.')
  };
}
function detectLanguages(root) {
  const exts = new Set();
  walk(root, p => exts.add(path.extname(p)));
  return Array.from(exts);
}
function walk(dir, cb) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.git')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, cb);
    else cb(p);
  }
}

module.exports = { repoContext };
