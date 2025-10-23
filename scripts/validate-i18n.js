const fs = require('fs');
const path = require('path');

function collectKeys(obj, prefix = '') {
  const keys = [];
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    const next = prefix ? `${prefix}.${k}` : k;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      keys.push(...collectKeys(val, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
}

function main() {
  const publicDir = path.join(process.cwd(), 'public', 'messages');
  const zhPath = path.join(publicDir, 'zh.json');
  const enPath = path.join(publicDir, 'en.json');

  if (!fs.existsSync(zhPath) || !fs.existsSync(enPath)) {
    console.error('Missing zh.json or en.json in public/messages');
    process.exit(2);
  }

  const zh = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));
  const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

  const zhKeys = collectKeys(zh).sort();
  const enKeys = collectKeys(en).sort();

  const missingInEn = zhKeys.filter(k => !enKeys.includes(k));
  const extraInEn = enKeys.filter(k => !zhKeys.includes(k));

  if (missingInEn.length === 0 && extraInEn.length === 0) {
    console.log('i18n validation passed: keys consistent');
    process.exit(0);
  }

  if (missingInEn.length) {
    console.error('Keys missing in en.json:\n', missingInEn.join('\n'));
  }
  if (extraInEn.length) {
    console.error('Extra keys in en.json:\n', extraInEn.join('\n'));
  }

  process.exit(1);
}

main();
