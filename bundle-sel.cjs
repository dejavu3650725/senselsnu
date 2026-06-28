const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'src/data');
const files = ['elementary_low', 'elementary_high', 'middle', 'high'];

let jsContent = 'export const selData = {\n';

for (const key of files) {
  const filePath = path.join(outDir, `sel_${key}.txt`);
  if (fs.existsSync(filePath)) {
    const text = fs.readFileSync(filePath, 'utf8');
    // Escape backticks and backslashes
    const escapedText = text.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
    jsContent += `  ${key}: \`${escapedText}\`,\n`;
  }
}

jsContent += '};\n';

fs.writeFileSync(path.join(outDir, 'selData.js'), jsContent, 'utf8');
console.log('Created src/data/selData.js');
