const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'Platform.Admin/src/locales');
const baselineDir = path.join(localesDir, 'zh-CN');
const targetLocales = fs.readdirSync(localesDir).filter(f =>
    fs.statSync(path.join(localesDir, f)).isDirectory() && f !== 'zh-CN' && f !== 'zh-TW' && f !== 'en-US'
);

const filesToCompare = ['menu.ts', 'pages.ts'];

function getKeys(filePath) {
    if (!fs.existsSync(filePath)) return new Set();
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(/'([^']+)'\s*:/g) || [];
    return new Set(matches.map(m => m.replace(/'/g, '').replace(':', '').trim()));
}

const missingReport = {};

targetLocales.forEach(locale => {
    missingReport[locale] = {};
    filesToCompare.forEach(file => {
        const baselineKeys = getKeys(path.join(baselineDir, file));
        const targetKeys = getKeys(path.join(localesDir, locale, file));

        const missing = [...baselineKeys].filter(k => !targetKeys.has(k));
        if (missing.length > 0) {
            missingReport[locale][file] = missing;
        }
    });
});

fs.writeFileSync('all_missing_locales.json', JSON.stringify(missingReport, null, 2));
console.log('Missing report generated: all_missing_locales.json');
