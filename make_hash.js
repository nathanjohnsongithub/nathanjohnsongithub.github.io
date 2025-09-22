// Usage: node make_hash.js your-password
// Outputs two lines: SALT_BASE64=... and HASH_BASE64=...
const crypto = require('crypto');

const pw = process.argv[2];
if (!pw) {
  console.error('Usage: node make_hash.js <password>');
  process.exit(1);
}

const salt = crypto.randomBytes(16);
const derived = crypto.scryptSync(pw, salt, 64);

console.log('OLD_MEM_PW_SALT=' + salt.toString('base64'));
console.log('OLD_MEM_PW_HASH=' + derived.toString('base64'));
