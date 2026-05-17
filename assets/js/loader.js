(function() {
    // Inject Premium GPU-optimized CSS Styles for Branded CHENARI Loading Screens
    const loaderStyles = `
        #chenariLoaderOverlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #080808;
            z-index: 9999999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            opacity: 1;
            visibility: visible;
            transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.8s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: all;
            box-sizing: border-box;
        }
        #chenariLoaderOverlay.fade-out {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }
        .loader-logo {
            font-family: 'Playfair Display', serif;
            font-size: 2.8rem;
            font-weight: 700;
            letter-spacing: 12px;
            display: flex;
            margin-bottom: 25px;
            text-transform: uppercase;
        }
        .loader-letter {
            display: inline-block;
            opacity: 0;
            transform: translateY(12px) scale(0.9);
            animation: letterGlowWave 2s infinite ease-in-out;
        }
        @keyframes letterGlowWave {
            0%, 100% {
                opacity: 0.25;
                transform: translateY(0) scale(1);
                filter: drop-shadow(0 0 2px rgba(255,255,255,0.05));
            }
            50% {
                opacity: 1;
                transform: translateY(-8px) scale(1.08);
                filter: drop-shadow(0 0 12px currentColor);
            }
        }
        /* Sequential Delays and Custom HSL Letter Colors */
        .loader-letter:nth-child(1) { animation-delay: 0.0s; color: #4285F4; }
        .loader-letter:nth-child(2) { animation-delay: 0.15s; color: #ea4335; margin-left: 2px; }
        .loader-letter:nth-child(3) { animation-delay: 0.3s; color: #34a853; margin-left: 2px; }
        .loader-letter:nth-child(4) { animation-delay: 0.45s; color: #fbbc05; margin-left: 2px; }
        .loader-letter:nth-child(5) { animation-delay: 0.6s; color: #ff5a5f; margin-left: 2px; }
        .loader-letter:nth-child(6) { animation-delay: 0.75s; color: #1b5e20; margin-left: 2px; }
        .loader-letter:nth-child(7) { animation-delay: 0.9s; color: #1565c0; margin-left: 2px; }

        /* Thin Luxury Progress Wave Line */
        .loader-progress-bar {
            width: 150px;
            height: 2px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 2px;
            position: relative;
            overflow: hidden;
            margin-top: 10px;
        }
        .loader-progress-fill {
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, #d4af37, transparent);
            animation: progressWave 1.6s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes progressWave {
            0% { left: -100%; }
            100% { left: 100%; }
        }

        /* Dynamic Loading Info State Text */
        .loader-state-text {
            color: rgba(255, 255, 255, 0.45);
            font-family: 'Inter', sans-serif;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-top: 25px;
            font-weight: 500;
            min-height: 15px;
            text-align: center;
            transition: opacity 0.3s ease;
        }
    `;

    // Inject Styles into Head
    const styleTag = document.createElement('style');
    styleTag.innerHTML = loaderStyles;
    document.head.appendChild(styleTag);

    // Pre-create Branded Loader Overlay
    const loaderHTML = `
        <div id="chenariLoaderOverlay">
            <div class="loader-logo">
                <span class="loader-letter">C</span>
                <span class="loader-letter">H</span>
                <span class="loader-letter">E</span>
                <span class="loader-letter">N</span>
                <span class="loader-letter">A</span>
                <span class="loader-letter">R</span>
                <span class="loader-letter">I</span>
            </div>
            <div class="loader-progress-bar">
                <div class="loader-progress-fill"></div>
            </div>
            <div id="chenariLoaderStateText" class="loader-state-text">Loading CHENARI Boutique</div>
        </div>
    `;

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

    // Global APIs for handling loading screens programmatically
    let loaderStartTime = Date.now();

    window.showChenariLoader = (stateText = 'Loading CHENARI Boutique') => {
        const overlay = document.getElementById('chenariLoaderOverlay');
        const txt = document.getElementById('chenariLoaderStateText');
        if (txt) txt.innerText = stateText;
        if (overlay) {
            overlay.classList.remove('fade-out');
            loaderStartTime = Date.now();
        }
    };

    window.updateChenariLoaderText = (stateText) => {
        const txt = document.getElementById('chenariLoaderStateText');
        if (txt) {
            txt.style.opacity = '0';
            setTimeout(() => {
                txt.innerText = stateText;
                txt.style.opacity = '1';
            }, 200);
        }
    };

    window.hideChenariLoader = () => {
        const overlay = document.getElementById('chenariLoaderOverlay');
        if (!overlay) return;

        const elapsedTime = Date.now() - loaderStartTime;
        const minDuration = 1000; // Enforce minimum 1 second show time for cinematic fluidity

        const delay = Math.max(0, minDuration - elapsedTime);
        setTimeout(() => {
            overlay.classList.add('fade-out');
        }, delay);
    };

    // Prevent White Flashes between Page transitions dynamically
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a');
        if (anchor && anchor.href && 
            anchor.target !== '_blank' && 
            !anchor.href.includes('#') && 
            !anchor.href.startsWith('javascript:') && 
            anchor.host === window.location.host) {
            
            const href = anchor.href;
            e.preventDefault();
            window.showChenariLoader('Transitioning Salon...');
            setTimeout(() => {
                window.location.href = href;
            }, 400); // Cinematic fade transition
        }
    });

    // Auto hide loader after complete page assets compile
    window.addEventListener('load', () => {
        window.hideChenariLoader();
    });
})();
