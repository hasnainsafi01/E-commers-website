(function() {
    // Inject Premium CSS Styles with invisible Loader Overlay to prevent blocking the screen
    const loaderStyles = `
        #chenariLoaderOverlay {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            z-index: -9999 !important;
        }
    `;

    // Inject Styles into Head
    const styleTag = document.createElement('style');
    styleTag.innerHTML = loaderStyles;
    document.head.appendChild(styleTag);

    // Pre-create Branded Loader Overlay (hidden)
    const loaderHTML = `<div id="chenariLoaderOverlay" style="display: none !important;"></div>`;

    // Append loader directly to the DOM as early as possible
    const appendLoader = () => {
        if (document.getElementById('chenariLoaderOverlay')) return;
        document.body.insertAdjacentHTML('afterbegin', loaderHTML);
    };

    if (document.body) {
        appendLoader();
    } else {
        document.addEventListener('DOMContentLoaded', appendLoader);
    }

    // Global APIs kept for backward compatibility so no scripts break
    window.showChenariLoader = (stateText = '') => {
        // No-op to avoid showing full-screen blocking screen
    };

    window.updateChenariLoaderText = (stateText) => {
        // No-op
    };

    window.hideChenariLoader = () => {
        // No-op
    };
})();
