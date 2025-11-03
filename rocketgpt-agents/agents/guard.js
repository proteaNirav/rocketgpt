const fs = require('fs');
const path = require('path');

module.exports = async function guard(spec) {
  // Very conservative placeholder: block if any key-like literal detected in new files
  const suspicious = [];
  const scan = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.git')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) scan(p);
      else if (/\.(cs|json|yaml|yml|js|ts|cshtml|env)$/i.test(p)) {
        const t = fs.readFileSync(p, 'utf8');
        if (/AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z-_]{35}|sk-[a-zA-Z0-9]{20,}/.test(t)) {
          suspicious.push(p);
        }
      }
    }
  };
  scan(process.cwd());
  if (suspicious.length) {
    console.error('Potential secrets detected:', suspicious);
    return { fail: true };
  }
  return { fail: false };
};
