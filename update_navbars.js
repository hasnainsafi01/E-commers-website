const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const headerContent = `<header>
        <nav class="navbar">
            <div class="mobile-toggle"><i class="fas fa-bars"></i></div>
            <!-- Logo -->
            <a href="index.html" class="logo">
                <span style="color:var(--primary-blue);">M</span><span style="color:var(--primary-red);">y</span><span style="color:var(--primary-green);">M</span><span style="color:var(--primary-orange);">a</span><span style="color:var(--light-red);">r</span><span style="color:var(--dark-green);">t</span>
            </a>

            <!-- Navigation Links -->
            <ul class="nav-links">
                <li><a href="index.html">Home</a></li>
                <li><a href="products.html?category=watches">Watches</a></li>
                <li><a href="products.html?category=bags">Bags</a></li>
                <li><a href="products.html?category=shoes">Shoes</a></li>
            </ul>

            <!-- Search Bar (Desktop) -->
            <div class="search-container">
                <i class="fas fa-search"></i>
                <input type="text" id="globalSearchInput" placeholder="Search MyMart items...">
                <div id="searchResults" class="search-results-dropdown hidden"></div>
            </div>

            <!-- Nav Actions (Icons & Profile) -->
            <div class="nav-actions">
                <div class="theme-toggle">
                    <i class="fas fa-moon"></i>
                </div>

                <a href="favorites.html" title="Favorites" class="auth-guarded" data-action="fav">
                    <i class="far fa-heart"></i>
                    <span class="badge" style="display:none;">0</span>
                </a>

                <a href="cart.html" title="Shopping Cart" class="auth-guarded" data-action="cart">
                    <i class="fas fa-shopping-cart"></i>
                    <span class="badge" style="display:none;">0</span>
                </a>
                
                <div id="navbarAuth" class="nav-auth-group"></div>
            </div>
        </nav>
    </header>`;

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    // Replace anything from <header> to </header>
    const regex = /<header>[\s\S]*?<\/header>/i;
    if (regex.test(content)) {
        content = content.replace(regex, headerContent);
        fs.writeFileSync(f, content);
        console.log('Updated ' + f);
    }
});
