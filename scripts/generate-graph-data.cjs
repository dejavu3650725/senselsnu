const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '../../obsidian-hub-main');
const outputFile = path.resolve(__dirname, '../src/assets/obsidian-graph-data.json');

const nodes = [];
const links = [];

let nodeIdCounter = 0;

function walkDir(currentPath, parentId = null) {
  const stats = fs.statSync(currentPath);
  const name = path.basename(currentPath);
  
  // Skip hidden files/folders (except root if needed)
  if (name.startsWith('.') && name !== 'obsidian-hub-main') return;

  const isDir = stats.isDirectory();
  const id = `node-${nodeIdCounter++}`;
  
  // Create node
  nodes.push({
    id,
    name,
    isDir,
    val: isDir ? 10 : 3 // size: directories are bigger
  });

  // Create link to parent
  if (parentId !== null) {
    links.push({
      source: parentId,
      target: id
    });
  }

  // Recurse if directory
  if (isDir) {
    const children = fs.readdirSync(currentPath);
    for (const child of children) {
      walkDir(path.join(currentPath, child), id);
    }
  }
}

console.log('Parsing obsidian-hub-main directory...');
walkDir(targetDir);

// Add some random cross-links to make it look more like a network rather than just a tree
const totalNodes = nodes.length;
const crossLinksToAdd = Math.floor(totalNodes * 0.1); // Add 10% cross links

for(let i=0; i<crossLinksToAdd; i++) {
  const sourceNode = nodes[Math.floor(Math.random() * totalNodes)];
  const targetNode = nodes[Math.floor(Math.random() * totalNodes)];
  if(sourceNode.id !== targetNode.id) {
    links.push({
      source: sourceNode.id,
      target: targetNode.id,
      isCrossLink: true
    });
  }
}

const graphData = { nodes, links };
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(graphData, null, 2));

console.log(`Successfully generated graph data with ${nodes.length} nodes and ${links.length} links.`);
console.log(`Saved to ${outputFile}`);
