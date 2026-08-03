const fs = require('fs');
const path = 'package-lock.json';
const backup = 'package-lock.json.backup';
if (!fs.existsSync(path)) {
  console.error('package-lock.json not found');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(path,'utf8'));
// backup
fs.writeFileSync(backup, JSON.stringify(data, null, 2));
console.log('backup written to', backup);

function stripWinBindings(obj, parentKey) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) stripWinBindings(item);
    return;
  }
  for (const key of Object.keys(obj)) {
    try {
      if (key.includes && key.includes('@rolldown') && key.includes('binding-win32')) {
        delete obj[key];
        console.log('removed key', key, 'from', parentKey || 'root');
        continue;
      }
      const val = obj[key];
      // If value is an object that maps package names to versions (like optionalDependencies)
      if (val && typeof val === 'object') {
        // If this object has keys that match the binding, remove them
        for (const subKey of Object.keys(val)) {
          if (subKey.includes && subKey.includes('@rolldown') && subKey.includes('binding-win32')) {
            delete val[subKey];
            console.log('removed nested entry', subKey, 'inside', key);
          }
        }
        // Recurse
        stripWinBindings(val, key);
      }
    } catch (e) {
      // ignore
    }
  }
}

stripWinBindings(data);

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('package-lock.json updated');
