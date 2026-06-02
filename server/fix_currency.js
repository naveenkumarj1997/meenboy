const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('d:/projects/cursor_project/meenboy2/client/src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (filePath.endsWith('api.ts')) {
      content = content.replace(/₹\{/g, '${');
    } else {
      let newContent = "";
      let inBacktick = false;
      for (let i = 0; i < content.length; i++) {
        if (content[i] === '`') {
            inBacktick = !inBacktick;
            newContent += content[i];
        } else if (inBacktick && content[i] === '₹' && content[i+1] === '{') {
            newContent += '$';
        } else {
            newContent += content[i];
        }
      }
      content = newContent;
    }
    
    if (content !== fs.readFileSync(filePath, 'utf8')) {
      fs.writeFileSync(filePath, content);
      console.log('Fixed ' + filePath);
    }
  }
});
