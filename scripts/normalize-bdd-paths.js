const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Windows path pattern: D:\orderly\ or D:\\orderly\\
// Unix path pattern: /home/user/orderly/ or similar
const patterns = [
  /D:\\orderly\\/gi,      // Windows with backslash escape
  /D:\\\\orderly\\\\/gi,  // Windows JSON encoded
  /.*?orderly[/\\]/,      // Generic: any path ending with orderly/
];

function normalizePathInContent(content) {
  try {
    let normalized = content;
    
    // Replace D:\orderly\ or D:\\orderly\\ with empty, leaving only src/...
    normalized = normalized.replace(/D:\\orderly\\/g, '');
    normalized = normalized.replace(/D:\\\\orderly\\\\/g, '');
    normalized = normalized.replace(/[^/\\]*orderly[/\\]/g, '');
    
    // Normalize path separators to forward slashes
    normalized = normalized.replace(/\\/g, '/');
    
    return normalized;
  } catch (error) {
    console.error('Error normalizing content:', error);
    return content;
  }
}

function processBddFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const normalized = normalizePathInContent(content);
    
    if (content !== normalized) {
      fs.writeFileSync(filePath, normalized, 'utf8');
      console.log(`✓ Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Find all .bdd.json files
const bddFiles = require('glob').sync('**/*.bdd.json', {
  cwd: process.cwd(),
  absolute: false,
});

console.log(`Found ${bddFiles.length} BDD spec files\n`);

let fixed = 0;
for (const file of bddFiles) {
  if (processBddFile(file)) {
    fixed++;
  }
}

console.log(`\nFixed ${fixed} files with hard-coded paths`);
