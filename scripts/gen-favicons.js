const sharp = require('sharp')
const toIco = require('to-ico')
const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, '../public/logo-icon.png')
const out = path.join(__dirname, '../public')

async function main() {
  const sizes = [
    { size: 16,  file: 'favicon-16x16.png' },
    { size: 32,  file: 'favicon-32x32.png' },
    { size: 180, file: 'apple-touch-icon.png' },
    { size: 512, file: 'logo-512.png' },
  ]

  for (const { size, file } of sizes) {
    await sharp(src).resize(size, size).png().toFile(path.join(out, file))
    console.log(`✓ ${file} (${size}x${size})`)
  }

  // ICO: embed 16x16 and 32x32 PNG buffers
  const [buf16, buf32] = await Promise.all([
    sharp(src).resize(16, 16).png().toBuffer(),
    sharp(src).resize(32, 32).png().toBuffer(),
  ])
  const ico = await toIco([buf16, buf32])
  fs.writeFileSync(path.join(out, 'favicon.ico'), ico)
  console.log('✓ favicon.ico (16+32)')
}

main().catch(err => { console.error(err); process.exit(1) })
