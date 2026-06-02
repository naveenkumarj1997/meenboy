const fs = require('fs');
const file = 'd:/projects/cursor_project/meenboy2/server/src/utils/pdfInvoice.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\?\{/g, '${');
fs.writeFileSync(file, content);
