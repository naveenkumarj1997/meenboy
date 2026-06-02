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
    let changed = false;
    
    // We want to replace '$' when it precedes a variable or a number in a template string, 
    // or when it's just used as currency.
    // E.g. ${something} in JSX -> ₹{something}
    // But wait! `${` in string templates shouldn't be touched.
    // So if we see `${product.priceRange.min.toFixed(2)}` in JSX, wait, that's just text inside JSX.
    // We only want to replace `$` if it's used as a currency symbol.
    // Since this is a simple app, let's just replace `$` with `₹` EXCEPT when it is part of `\$\{` inside a template literal.
    
    // In JSX, currency is rendered as `${value}` or `$${value}` (template string).
    // Let's manually replace the known ones:
    
    const replacements = [
      { find: 'from ${', replace: 'from ₹{' },
      { find: '>${', replace: '>₹{' },
      { find: ' $', replace: ' ₹' }, // e.g. "orders over $100" -> "orders over ₹100"
      { find: '`$${', replace: '`₹${' } // e.g. `$${data.revenue.toFixed(2)}`
    ];

    replacements.forEach(r => {
      if (content.includes(r.find)) {
        content = content.split(r.find).join(r.replace);
        changed = true;
      }
    });
    
    // Also handle \n + whitespace + ${
    content = content.replace(/(\n\s*)\$\{([a-zA-Z_])/g, '$1₹{$2');
    
    if (changed || content !== fs.readFileSync(filePath, 'utf8')) {
      fs.writeFileSync(filePath, content);
      console.log('Updated ' + filePath);
    }
  }
});
