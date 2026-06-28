const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const selDir = path.join(__dirname, '../SEL');
const outDir = path.join(__dirname, 'src/data');

const filesToProcess = [
  { file: '01_한국형_사회정서교육_(초등저)_교사용_지도서.pdf', key: 'elementary_low' },
  { file: '02_한국형_사회정서교육_(초등고)_교사용_지도서.pdf', key: 'elementary_high' },
  { file: '03_한국형_사회정서교육_(중학교)_교사용_지도서.pdf', key: 'middle' },
  { file: '04_한국형_사회정서교육_(고등학교)_교사용_지도서.pdf', key: 'high' }
];

async function extractText() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const item of filesToProcess) {
    const pdfPath = path.join(selDir, item.file);
    if (!fs.existsSync(pdfPath)) {
      console.error(`File not found: ${pdfPath}`);
      continue;
    }

    console.log(`Extracting text from ${item.file}...`);
    try {
      let dataBuffer = fs.readFileSync(pdfPath);
      let data = await pdf(dataBuffer);
      
      // Clean up text (remove excessive newlines and whitespace)
      let text = data.text.replace(/\n\s*\n/g, '\n\n').trim();
      
      // Save to src/data/sel_{key}.txt
      const outPath = path.join(outDir, `sel_${item.key}.txt`);
      fs.writeFileSync(outPath, text, 'utf8');
      console.log(`Saved extracted text to ${outPath}`);
    } catch (err) {
      console.error(`Error processing ${item.file}:`, err);
    }
  }
}

extractText();
