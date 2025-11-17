let tooltipp = null;
let hoverTimeout = null;
let currentTarget = null;

// Create Tooltip
function createTooltip() {
    const div = document.createElement('div');
    div.id = 'phishnet-hover-tooltip';
    div.style.cssText = `
        position: fixed;
        z-index: 2147483647 !important;
        padding: 10px 14px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        backdrop-filter: blur(5px);
        pointer-events: none;
        display: none;
        transition: all 0.2s ease;
    `;
    document.body.appendChild(div);
    return div;
}

tooltipp = createTooltip();

// Helper: Recursively find a URL in an element or its family
function findUrlInElement(el) {
    if (!el) return null;

    // 1. Check standard HREF
    if (el.href && el.href.startsWith('http')) return el.href;
    if (el.getAttribute('href')) return el.getAttribute('href');

    // 2. Check Data Attributes (Common in SPAs)
    const dataUrl = el.getAttribute('data-href') || el.getAttribute('data-link') || el.getAttribute('data-url');
    if (dataUrl && dataUrl.startsWith('http')) return dataUrl;

    // 3. Check Title or Aria-Label (Sometimes hidden there)
    if (el.title && el.title.startsWith('http')) return el.title;
    if (el.getAttribute('aria-label') && el.getAttribute('aria-label').startsWith('http')) return el.getAttribute('aria-label');

    return null;
}

// Scan Logic
async function scanLink(url, x, y) {
    // UI: Loading
    tooltipp.style.display = 'block';
    tooltipp.style.top = (y - 50) + 'px';
    tooltipp.style.left = (x + 10) + 'px';
    tooltipp.style.background = 'rgba(30, 41, 59, 0.95)'; 
    tooltipp.style.color = '#94a3b8'; 
    tooltipp.style.border = '1px solid #334155';
    tooltipp.innerHTML = `<div style="display:flex; align-items:center; gap:8px;"><span>⏳</span> Scanning...</div>`;

    try {
        const response = await fetch('http://127.0.0.1:8000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });
        const data = await response.json();

        if (data.is_safe) {
            tooltipp.style.background = 'rgba(6, 78, 59, 0.95)';
            tooltipp.style.border = '1px solid #10b981';
            tooltipp.style.color = '#ffffff';
            tooltipp.innerHTML = `✅ Safe <span style="opacity:0.7">(${Math.round(data.confidence*100)}%)</span>`;
        } else {
            tooltipp.style.background = 'rgba(127, 29, 29, 0.95)';
            tooltipp.style.border = '1px solid #ef4444';
            tooltipp.style.color = '#ffffff';
            tooltipp.innerHTML = `⚠️ <b>PHISHING</b> DETECTED`;
        }
    } catch (err) {
        tooltipp.style.display = 'none'; 
    }
}

// --- ADVANCED EVENT LISTENER ---

document.addEventListener('mouseover', (e) => {
    const target = e.target;
    let foundUrl = null;
    let clickableElement = null;

    // STRATEGY 1: Check the element itself
    foundUrl = findUrlInElement(target);
    if (foundUrl) clickableElement = target;

    // STRATEGY 2: Check Parents (Up to 3 levels up)
    if (!foundUrl) {
        let parent = target.parentElement;
        for (let i = 0; i < 3; i++) {
            if (parent) {
                foundUrl = findUrlInElement(parent);
                if (foundUrl) {
                    clickableElement = parent;
                    break;
                }
                parent = parent.parentElement;
            }
        }
    }

    // STRATEGY 3: Check Specific WhatsApp Button Structure
    // If it's a button/role=button but NO URL found, it might be a JS-only button.
    // We still highlight it, but warn the user.
    if (!foundUrl) {
        const btn = target.closest('button, [role="button"]');
        if (btn) {
            clickableElement = btn;
            // We found a button, but NO URL. 
            // This is the "WhatsApp Hidden Link" scenario.
        }
    }

    // ACTION
    if (clickableElement) {
        // Highlight
        currentTarget = clickableElement;
        currentTarget.style.outline = '2px dashed #38bdf8';
        currentTarget.style.outlineOffset = '2px';
        currentTarget.style.cursor = 'wait';

        if (foundUrl) {
            // If we found a URL, Scan it!
            hoverTimeout = setTimeout(() => {
                scanLink(foundUrl, e.clientX, e.clientY);
            }, 400);
        } else {
            // If it's a button but HIDDEN URL, show specific tooltip
            tooltipp.style.display = 'block';
            tooltipp.style.top = (e.clientY - 50) + 'px';
            tooltipp.style.left = (e.clientX + 10) + 'px';
            tooltipp.style.background = '#334155';
            tooltipp.style.color = '#cbd5e1';
            tooltipp.style.border = '1px solid #475569';
            tooltipp.innerHTML = `🔒 Link hidden by App`;
        }
    }
});

document.addEventListener('mouseout', (e) => {
    if (currentTarget) {
        clearTimeout(hoverTimeout);
        tooltipp.style.display = 'none';
        currentTarget.style.outline = '';
        currentTarget.style.outlineOffset = '';
        currentTarget.style.cursor = '';
        currentTarget = null;
    }
});

document.addEventListener('mousemove', (e) => {
    if (tooltipp.style.display === 'block') {
        tooltipp.style.top = (e.clientY - 50) + 'px';
        tooltipp.style.left = (e.clientX + 10) + 'px';
    }
});