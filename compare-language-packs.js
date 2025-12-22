const fs = require('fs');
const path = require('path');

// 读取语言包文件
function readLanguageFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // 移除 export default 和外层花括号，然后解析为对象
    const jsonContent = content.replace(/export default\s*|{|}/g, '').trim();
    const lines = jsonContent.split('\n');
    const translations = {};
    
    let currentKey = '';
    let currentValue = '';
    let inMultiLine = false;
    
    lines.forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('//')) return;
      
      if (inMultiLine) {
        currentValue += line;
        if (line.endsWith(',')) {
          currentValue = currentValue.replace(/,$/, '');
          translations[currentKey] = currentValue;
          inMultiLine = false;
          currentKey = '';
          currentValue = '';
        }
      } else {
        const match = line.match(/^'(.*?)':\s*(.*?)$/);
        if (match) {
          currentKey = match[1];
          currentValue = match[2];
          
          if (currentValue.endsWith(',')) {
            currentValue = currentValue.replace(/,$/, '');
            translations[currentKey] = currentValue;
            currentKey = '';
            currentValue = '';
          } else {
            inMultiLine = true;
          }
        }
      }
    });
    
    return translations;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return {};
  }
}

// 比较两个语言包，找出缺少的键
function compareLanguagePacks(baseLang, compareLang) {
  const baseKeys = Object.keys(baseLang);
  const compareKeys = Object.keys(compareLang);
  
  const missingKeys = baseKeys.filter(key => !compareKeys.includes(key));
  const extraKeys = compareKeys.filter(key => !baseKeys.includes(key));
  
  return {
    missingKeys,
    extraKeys
  };
}

// 获取所有语言包目录
function getLanguageDirectories() {
  const localesPath = path.join(__dirname, 'Platform.Admin/src/locales');
  const directories = fs.readdirSync(localesPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  return directories;
}

// 主函数
function main() {
  const basePath = path.join(__dirname, 'Platform.Admin/src/locales/en-US/pages.ts');
  const baseLang = readLanguageFile(basePath);
  
  const languageDirs = getLanguageDirectories();
  
  console.log('=== Language Pack Comparison ===');
  console.log(`Base language (en-US) has ${Object.keys(baseLang).length} keys\n`);
  
  // 比较每个语言包
  languageDirs.forEach(lang => {
    if (lang === 'en-US') return; // 跳过基础语言
    
    const comparePath = path.join(__dirname, `Platform.Admin/src/locales/${lang}/pages.ts`);
    const compareLang = readLanguageFile(comparePath);
    
    const result = compareLanguagePacks(baseLang, compareLang);
    
    console.log(`=== ${lang} ===`);
    console.log(`Total keys in ${lang}: ${Object.keys(compareLang).length}`);
    console.log(`Missing keys: ${result.missingKeys.length}`);
    console.log(`Extra keys: ${result.extraKeys.length}`);
    
    // 只显示前10个缺少的键
    if (result.missingKeys.length > 0) {
      console.log('Sample missing keys:');
      console.log(result.missingKeys.slice(0, 10).join('\n'));
      if (result.missingKeys.length > 10) {
        console.log(`... and ${result.missingKeys.length - 10} more`);
      }
    }
    
    console.log('');
  });
}

main();