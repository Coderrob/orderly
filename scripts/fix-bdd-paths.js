const fs = require('fs');
const glob = require('glob');

function fixBddFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Replace double slashes with single slashes
    content = content.replace(/\/\//g, '/');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

const bddFiles = glob.sync('**/*.bdd.json', { absolute: false });

console.log(`Found ${bddFiles.length} BDD spec files\n`);

let fixed = 0;
for (const file of bddFiles) {
  if (fixBddFile(file)) {
    fixed++;
  }
}

console.log(`\nFixed ${fixed} files`);
