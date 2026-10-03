import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function buildAuthenticLogoBanner() {
  // Balanced size, with Cinema XXI shifted left and Cinema 21 shifted right
  const xxi = await sharp('public/cinema-xxi.svg')
    .resize({ width: 490 })
    .toBuffer({ resolveWithObject: true });

  const premiere = await sharp('public/the-premiere.svg')
    .resize({ height: 86 })
    .toBuffer({ resolveWithObject: true });

  const c21 = await sharp('public/cinema-21.svg')
    .resize({ width: 435 })
    .toBuffer({ resolveWithObject: true });

  // Shift Cinema XXI further to the left (left: 20px)
  const leftPos = { left: 20, top: Math.round((180 - xxi.info.height) / 2) };

  // Keep the Premiere centered
  const centerPos = {
    left: Math.round((2400 - premiere.info.width) / 2),
    top: Math.round((180 - premiere.info.height) / 2)
  };

  // Shift Cinema 21 further to the right (right margin: 20px)
  const rightPos = {
    left: 2400 - 20 - c21.info.width,
    top: Math.round((180 - c21.info.height) / 2)
  };

  await sharp({
    create: {
      width: 2400,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    }
  })
    .composite([
      { input: xxi.data, left: leftPos.left, top: leftPos.top },
      { input: premiere.data, left: centerPos.left, top: centerPos.top },
      { input: c21.data, left: rightPos.left, top: rightPos.top }
    ])
    .png()
    .toFile('public/cinema-trio-header.png');

  console.log('Built shifted public/cinema-trio-header.png successfully!');
}

buildAuthenticLogoBanner().catch(console.error);
