const fs = require('fs');

const cssFile = 'assets/css/style.css';
if (fs.existsSync(cssFile)) {
    let cssContent = fs.readFileSync(cssFile, 'utf8');

    // Replace MyMart -> MyMart in CSS comments
    cssContent = cssContent.replace(/MyMart/g, 'MyMart');
    // Add some premium shopify/amazon CSS
    cssContent = cssContent.replace('.navbar.scrolled {\r\n    height: 70px;\r\n    box-shadow: var(--shadow);\r\n}', '.navbar.scrolled {\r\n    height: 70px;\r\n    box-shadow: 0 4px 15px rgba(0,0,0,0.05);\r\n    backdrop-filter: blur(20px);\r\n}');

    fs.writeFileSync(cssFile, cssContent);
    console.log("Updated style.css");
}

const jsFiles = ['assets/js/main.js', 'assets/js/navbar-auth.js'];
jsFiles.forEach(f => {
    if (fs.existsSync(f)) {
        let jsContent = fs.readFileSync(f, 'utf8');
        // Replace MyMart logo in main.js
        jsContent = jsContent.replace(/<span>C<\/span><span>H<\/span><span>E<\/span><span>N<\/span><span>A<\/span><span>R<\/span><span>I<\/span>/g, '<span style="color:var(--primary-blue);">M</span><span style="color:var(--primary-red);">y</span><span style="color:var(--primary-green);">M</span><span style="color:var(--primary-orange);">a</span><span style="color:var(--light-red);">r</span><span style="color:var(--dark-green);">t</span>');
        
        jsContent = jsContent.replace(/MyMart/g, 'MyMart');
        
        // Update the big pop-up in main.js
        jsContent = jsContent.replace(/<span style="color: #4285F4;">C<\/span>[\s\S]*?<span style="color: #1565c0; margin-left: 2px;">I<\/span>/, '<span style="color: #4285F4;">M</span><span style="color: #ea4335; margin-left: 2px;">y</span><span style="color: #34a853; margin-left: 2px;">M</span><span style="color: #fbbc05; margin-left: 2px;">a</span><span style="color: #ff5a5f; margin-left: 2px;">r</span><span style="color: #1b5e20; margin-left: 2px;">t</span>');
        
        fs.writeFileSync(f, jsContent);
        console.log("Updated " + f);
    }
});
