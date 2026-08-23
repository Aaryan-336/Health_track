import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ICONS = path.join(process.cwd(), 'public', 'icons');
const source = await readFile(path.join(ICONS, 'icon.svg'));
const badge = await readFile(path.join(ICONS, 'badge.svg'));

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
];

for (const { name, size } of targets) {
  const out = await sharp(source).resize(size, size).png().toBuffer();
  await writeFile(path.join(ICONS, name), out);
  console.log(`  ✓ ${name} (${size}×${size})`);
}

// Maskable icon needs the artwork inset within the safe zone (80% of canvas).
const inner = await sharp(source).resize(410, 410).png().toBuffer();
const maskable = await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#FBD6E4' },
})
  .composite([{ input: inner, top: 51, left: 51 }])
  .png()
  .toBuffer();
await writeFile(path.join(ICONS, 'icon-maskable-512.png'), maskable);
console.log('  ✓ icon-maskable-512.png (512×512, maskable)');

const badgePng = await sharp(badge).resize(96, 96).png().toBuffer();
await writeFile(path.join(ICONS, 'badge.png'), badgePng);
console.log('  ✓ badge.png (96×96)');
