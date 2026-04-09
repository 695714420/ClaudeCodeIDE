const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const buildDir = path.join(__dirname, '..', 'build')
const svgPath = path.join(buildDir, 'icon.svg')
const pngPath = path.join(buildDir, 'icon.png')
const icoPath = path.join(buildDir, 'icon.ico')

// Simple ICO file creator from a single PNG
function createIco(pngBuffer) {
  const pngSize = pngBuffer.length
  // ICO header: 6 bytes
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)     // reserved
  header.writeUInt16LE(1, 2)     // type: 1 = ICO
  header.writeUInt16LE(1, 4)     // count: 1 image

  // Directory entry: 16 bytes
  const entry = Buffer.alloc(16)
  entry.writeUInt8(0, 0)         // width: 0 = 256
  entry.writeUInt8(0, 1)         // height: 0 = 256
  entry.writeUInt8(0, 2)         // color palette
  entry.writeUInt8(0, 3)         // reserved
  entry.writeUInt16LE(1, 4)      // color planes
  entry.writeUInt16LE(32, 6)     // bits per pixel
  entry.writeUInt32LE(pngSize, 8)  // image size
  entry.writeUInt32LE(22, 12)    // offset (6 + 16 = 22)

  return Buffer.concat([header, entry, pngBuffer])
}

async function main() {
  await sharp(svgPath).resize(256, 256).png().toFile(pngPath)
  console.log('Created build/icon.png')

  const pngBuf = fs.readFileSync(pngPath)
  const icoBuf = createIco(pngBuf)
  fs.writeFileSync(icoPath, icoBuf)
  console.log('Created build/icon.ico')
}

main().catch(e => { console.error(e); process.exit(1) })
