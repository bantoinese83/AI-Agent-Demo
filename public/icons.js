// Import Lucide React icons
// Note: This is a client-side only approach - for server-side we use simple SVGs
// In a real React app, you would import these properly

// Fallback SVG icons (same as before for CSP compatibility)
const Icons = {
  gamepad: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon" width="24" height="24">
    <path d="M6 4h4v16H6V4zM14 4h4v16h-4V4z"/>
    <circle cx="12" cy="12" r="2"/>
    <path d="M2 18v2h20v-2"/>
  </svg>`,

  mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon" width="24" height="24">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>`,

  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon" width="24" height="24">
    <path d="M16 18l6-6H8l6 6z"/>
    <path d="M16 6l6 6H8l6-6z"/>
    <path d="M4 12h16"/>
  </svg>`,

  zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon" width="24" height="24">
    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
  </svg>`,

  arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon" width="24" height="24">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>`,

  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon" width="24" height="24">
    <path d="M22 2L11 13"/>
    <path d="M22 2L15 22L11 13L2 9"/>
  </svg>`,

  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon" width="24" height="24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>`,

  bot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon" width="24" height="24">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <rect x="6" y="6" width="12" height="12" rx="1" ry="1"/>
    <path d="M9 10h6"/>
    <path d="M9 14h6"/>
  </svg>`
};

// Function to create an icon element
function createIcon(name, size = 24, className = '') {
  const icon = Icons[name];
  if (!icon) {
    console.warn(`Icon "${name}" not found`);
    return `<div class="${className}" style="width:${size}px;height:${size}px;display:inline-block;background:#e5e7eb;border-radius:4px;"></div>`;
  }

  // Replace the existing attributes with new ones
  return icon
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`)
    .replace(/class="[^"]*"/, `class="icon ${className}"`);
}

// Make icons available globally
window.Icons = Icons;
window.createIcon = createIcon;
