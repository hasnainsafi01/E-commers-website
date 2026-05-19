const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace MyMart -> MyMart
    content = content.replace(/MyMart/g, 'MyMart');
    // Replace MyMart -> MyMart
    content = content.replace(/MyMart/g, 'MyMart');
    // Replace mymart -> mymart
    content = content.replace(/mymart/g, 'mymart');
    
    fs.writeFileSync(filePath, content);
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== '.git' && file !== 'node_modules' && file !== '.vscode') {
                processDirectory(fullPath);
            }
        } else {
            if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css')) {
                replaceInFile(fullPath);
            }
        }
    }
}

processDirectory('.');
console.log('Global branding update complete.');
