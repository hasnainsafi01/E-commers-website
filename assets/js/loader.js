/**
 * MyMart Premium Loading States
 * ─────────────────────────────
 * Rules:
 *   1. Full-screen branded loader  → ONLY during explicit auth operations (login/signup/logout)
 *   2. Skeleton cards              → ONLY injected by product-render functions when Firebase fetch takes >300ms
 *   3. No global loader            → Normal page navigation is instant; no overlay shown
 *
 * Exposed globals:
 *   window.showMyMartLoader(text?)          — Show auth-grade full-screen loader
 *   window.hideMyMartLoader()               — Hide full-screen loader
 *   window.updateMyMartLoaderText(text)     — Update loader status text with fade
 *   window.startSkeletonTimeout(fn, ms?)    — Show skeletons only if fn takes longer than ms (default 400ms)
 */

(function () {
    // ── Styles ──────────────────────────────────────────────────────────────
    const css = `
        /* ── Full-Screen Auth Loader ── */
        #mmAuthLoader {
            position: fixed;
            inset: 0;
            background: #090909;
            z-index: 9999999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                        visibility 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        #mmAuthLoader.mm-active {
            opacity: 1;
            visibility: visible;
            pointer-events: all;
        }

        /* Animated MyMart logo */
        .mm-loader-logo {
            display: flex;
            align-items: baseline;
            gap: 1px;
            margin-bottom: 32px;
        }
        .mm-loader-letter {
            font-family: 'Playfair Display', 'Georgia', serif;
            font-size: 3rem;
            font-weight: 800;
            display: inline-block;
            animation: mmLetterBounce 1.8s ease-in-out infinite;
            will-change: transform, opacity;
        }
        .mm-loader-letter:nth-child(1) { color: #4285F4; animation-delay: 0.00s; }
        .mm-loader-letter:nth-child(2) { color: #ea4335; animation-delay: 0.12s; }
        .mm-loader-letter:nth-child(3) { color: #34a853; animation-delay: 0.24s; }
        .mm-loader-letter:nth-child(4) { color: #fbbc05; animation-delay: 0.36s; }
        .mm-loader-letter:nth-child(5) { color: #ff5a5f; animation-delay: 0.48s; }
        .mm-loader-letter:nth-child(6) { color: #2e7d32; animation-delay: 0.60s; }

        @keyframes mmLetterBounce {
            0%, 100% { transform: translateY(0) scale(1);   opacity: 0.3; filter: none; }
            45%       { transform: translateY(-10px) scale(1.1); opacity: 1;   filter: drop-shadow(0 0 10px currentColor); }
        }

        /* Progress shimmer bar */
        .mm-loader-bar {
            width: 140px;
            height: 2px;
            background: rgba(255,255,255,0.07);
            border-radius: 2px;
            overflow: hidden;
            position: relative;
        }
        .mm-loader-bar::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, transparent, #d4af37, transparent);
            animation: mmBarSlide 1.4s ease-in-out infinite;
        }
        @keyframes mmBarSlide {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
        }

        /* Status text */
        .mm-loader-text {
            margin-top: 22px;
            font-family: 'Inter', sans-serif;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 3px;
            color: rgba(255,255,255,0.38);
            font-weight: 500;
            min-height: 14px;
            transition: opacity 0.25s;
        }

        /* ── Skeleton Cards ── */
        .skeleton-card {
            border-radius: 14px;
            overflow: hidden;
            background: var(--nav-bg, #f5f5f5);
            border: 1px solid var(--nav-border, #e8e8e8);
        }
        .skeleton-img {
            width: 100%;
            height: 220px;
            background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
            background-size: 200% 100%;
            animation: mmSkeletonShimmer 1.5s ease-in-out infinite;
        }
        .skeleton-info {
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 9px;
        }
        .skeleton-text {
            height: 12px;
            border-radius: 6px;
            background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
            background-size: 200% 100%;
            animation: mmSkeletonShimmer 1.5s ease-in-out infinite;
        }
        .skeleton-text.short  { width: 55%; }
        .skeleton-text.medium { width: 75%; }

        @keyframes mmSkeletonShimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        /* Dark-mode skeleton adaptation */
        @media (prefers-color-scheme: dark) {
            .skeleton-img, .skeleton-text {
                background: linear-gradient(90deg, #2a2a2a 25%, #333 50%, #2a2a2a 75%);
                background-size: 200% 100%;
            }
        }
        body.dark .skeleton-img, body.dark .skeleton-text {
            background: linear-gradient(90deg, #2a2a2a 25%, #333 50%, #2a2a2a 75%);
            background-size: 200% 100%;
        }

        /* ── Mini spinner (inline, non-blocking) ── */
        .mm-mini-spinner {
            display: inline-block;
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255,255,255,0.25);
            border-top-color: white;
            border-radius: 50%;
            animation: mmSpin 0.65s linear infinite;
            vertical-align: middle;
        }
        @keyframes mmSpin {
            to { transform: rotate(360deg); }
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'mmLoaderStyles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // ── Auth Loader DOM ──────────────────────────────────────────────────────
    const loaderHTML = `
        <div id="mmAuthLoader" role="status" aria-label="Loading" aria-live="polite">
            <div class="mm-loader-logo" aria-hidden="true">
                <span class="mm-loader-letter">M</span>
                <span class="mm-loader-letter">y</span>
                <span class="mm-loader-letter">M</span>
                <span class="mm-loader-letter">a</span>
                <span class="mm-loader-letter">r</span>
                <span class="mm-loader-letter">t</span>
            </div>
            <div class="mm-loader-bar"></div>
            <div id="mmLoaderText" class="mm-loader-text">Please wait</div>
        </div>
    `;

    const inject = () => {
        if (document.getElementById('mmAuthLoader')) return;
        document.body.insertAdjacentHTML('afterbegin', loaderHTML);
    };

    if (document.body) {
        inject();
    } else {
        document.addEventListener('DOMContentLoaded', inject);
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Show the full-screen branded loader.
     * USE ONLY during auth operations (login, signup, logout, role verification).
     */
    window.showMyMartLoader = (text = 'Please wait') => {
        inject(); // safety net
        const el = document.getElementById('mmAuthLoader');
        const txt = document.getElementById('mmLoaderText');
        if (txt) txt.textContent = text;
        if (el) {
            // Use rAF to guarantee CSS transition fires
            requestAnimationFrame(() => el.classList.add('mm-active'));
        }
    };

    /**
     * Hide the full-screen loader with a smooth fade.
     * SAFE NO-OP: Only hides if the loader is currently visible.
     * Data-fetch calls in cart.js / favorites.js will hit this safely.
     */
    window.hideMyMartLoader = () => {
        const el = document.getElementById('mmAuthLoader');
        if (el && el.classList.contains('mm-active')) {
            el.classList.remove('mm-active');
        }
    };

    /**
     * Update the status text inside the loader with a fade effect.
     * SAFE NO-OP: Only updates text if the loader is currently visible.
     * Prevents data-fetch calls from accidentally activating the overlay.
     */
    window.updateMyMartLoaderText = (text) => {
        const el = document.getElementById('mmAuthLoader');
        if (!el || !el.classList.contains('mm-active')) return; // Guard: only update if shown
        const txt = document.getElementById('mmLoaderText');
        if (!txt) return;
        txt.style.opacity = '0';
        setTimeout(() => {
            txt.textContent = text;
            txt.style.opacity = '1';
        }, 200);
    };

    // ── Skeleton helper ──────────────────────────────────────────────────────

    /**
     * Generate N skeleton card HTML strings for injection before slow fetches.
     * @param {number} count - number of skeleton cards to generate
     */
    window.generateSkeletons = (count = 6) => {
        return Array(count).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton-img"></div>
                <div class="skeleton-info">
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text short"></div>
                    <div class="skeleton-text medium"></div>
                </div>
            </div>
        `).join('');
    };

    /**
     * Generate a mini inline spinner element.
     */
    window.createMiniSpinner = () => {
        const s = document.createElement('span');
        s.className = 'mm-mini-spinner';
        return s;
    };

})();
