/**
 * Generate a simple SVG icon and convert to PNG using canvas.
 * Run: node scripts/generate-icon.js
 * 
 * This creates a 256x256 PNG icon with a modern code/AI theme.
 * For ICO conversion, use an online tool or `png-to-ico` package.
 */
const fs = require('fs')
const path = require('path')

const size = 256
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/>
      <stop offset="100%" style="stop-color:rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <!-- Rounded square background -->
  <rect width="${size}" height="${size}" rx="48" ry="48" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" rx="48" ry="48" fill="url(#shine)"/>
  <!-- Code brackets < /> -->
  <text x="128" y="148" font-family="Consolas, Monaco, monospace" font-size="100" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">&lt;/&gt;</text>
  <!-- AI sparkle dot -->
  <circle cx="200" cy="56" r="16" fill="#fbbf24" opacity="0.9"/>
  <circle cx="200" cy="56" r="8" fill="white" opacity="0.8"/>
</svg>`

const buildDir = path.join(__dirname, '..', 'build')
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true })
}

fs.writeFileSync(path.join(buildDir, 'icon.svg'), svg)
console.log('Created build/icon.svg')
console.log('')
console.log('To create icon.ico and icon.png:')
console.log('  1. Open build/icon.svg in a browser')
console.log('  2. Use https://convertio.co/svg-ico/ to convert to .ico (256x256)')
console.log('  3. Use https://convertio.co/svg-png/ to convert to .png (256x256)')
console.log('  4. Save as build/icon.ico and build/icon.png')
console.log('')
console.log('Or install sharp: npm i -D sharp')
console.log('Then run the PNG conversion below.')
