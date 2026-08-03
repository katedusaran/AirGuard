const fs = require('fs');
const path = 'node_modules/@rolldown/.binding-win32-x64-msvc-cdCVzHkK/rolldown-binding.win32-x64-msvc.node';
try {
  fs.unlinkSync(path);
  console.log('unlink-ok');
} catch (e) {
  console.error('unlink-err', e && e.message ? e.message : e);
  process.exitCode = 1;
}
