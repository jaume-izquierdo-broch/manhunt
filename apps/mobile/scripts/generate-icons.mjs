// Generates every icon, splash and logo image from the vector source.
//
//   pnpm --filter @manhunt/mobile icons
//
// Source: assets/brand/manhunt-icon.svg (512x512, full-bleed). Its `layer:` comments
// split it into a backdrop, the artwork (figure + crosshair) and an overlay
// (scanlines + vignette), which lets us build Android's two-layer adaptive icon.
//
// Expo only needs these few large images: `expo prebuild` / EAS derive every
// native size (Android mipmaps, iOS AppIcon set) from them.
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const source = readFileSync(join(ASSETS, 'brand', 'manhunt-icon.svg'), 'utf8');

const VIEWBOX = 512;
/** Corner radius of the rounded variant (logo, favicon), same as the brand kit. */
const CORNER_RADIUS = 112;
/**
 * Android crops the adaptive icon's foreground to a mask (circle, squircle...) that
 * only guarantees the central 66%. At 0.72 the crosshair (r = 214 + ticks) stays inside it.
 */
const ADAPTIVE_SCALE = 0.72;

function extract(pattern, name) {
  const match = source.match(pattern);
  if (!match) throw new Error(`manhunt-icon.svg: missing ${name}`);
  return match[1];
}

const defs = extract(/<defs>([\s\S]*?)<\/defs>/, '<defs>');
const layer = (name) =>
  extract(
    new RegExp(`<!-- layer:${name} -->([\\s\\S]*?)<!-- /layer:${name} -->`),
    `layer:${name}`,
  );
const backdrop = layer('backdrop');
const artwork = layer('artwork');
const overlay = layer('overlay');

const svg = (body, extraDefs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${VIEWBOX}" height="${VIEWBOX}" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}"><defs>${defs}${extraDefs}</defs>${body}</svg>`;

const scaled = (body, scale) => {
  const c = VIEWBOX / 2;
  return `<g transform="translate(${c} ${c}) scale(${scale}) translate(${-c} ${-c})">${body}</g>`;
};

const rounded = (body) =>
  `<clipPath id="corners"><rect width="${VIEWBOX}" height="${VIEWBOX}" rx="${CORNER_RADIUS}"/></clipPath>` +
  `<g clip-path="url(#corners)">${body}</g>`;

const full = backdrop + artwork + overlay;

/**
 * Android 13+ themed icon: one white ink the system tints. The hood is solid
 * with the face cut out; eyes and crosshair are drawn on top.
 */
const monochrome = svg(
  scaled(
    `<g filter="url(#ink)" mask="url(#face-cut)"><use href="#hood"/></g>
     <g filter="url(#ink)"><use href="#eyes"/><use href="#crosshair"/></g>`,
    ADAPTIVE_SCALE,
  ),
  `<g id="source">${artwork}</g>
   <filter id="ink" x="-20%" y="-20%" width="140%" height="140%">
     <feFlood flood-color="#fff"/>
     <feComposite in2="SourceAlpha" operator="in"/>
     <feComponentTransfer><feFuncA type="linear" slope="1.8"/></feComponentTransfer>
   </filter>
   <mask id="face-cut"><rect width="${VIEWBOX}" height="${VIEWBOX}" fill="#fff"/><use href="#face"/></mask>`,
);

/** File (relative to assets/) -> size in px and SVG. */
const outputs = [
  // App icon (iOS and the fallback everywhere else). Square and opaque: iOS rounds it.
  { file: 'images/icon.png', size: 1024, svg: svg(full) },
  // Android adaptive icon: an opaque backdrop plus the artwork inside the safe zone.
  {
    file: 'images/android-icon-background.png',
    size: 1024,
    svg: svg(backdrop + overlay),
  },
  {
    file: 'images/android-icon-foreground.png',
    size: 1024,
    svg: svg(scaled(artwork, ADAPTIVE_SCALE)),
  },
  { file: 'images/android-icon-monochrome.png', size: 432, svg: monochrome },
  // Splash: the artwork alone over the background color from app.json. The body
  // fades out at the bottom so it doesn't end in a hard edge mid-screen.
  {
    file: 'images/splash-icon.png',
    size: 512,
    svg: svg(
      `<g mask="url(#fade)">${artwork}</g>`,
      `<linearGradient id="fade-ramp" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0.7" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
       </linearGradient>
       <mask id="fade"><rect width="${VIEWBOX}" height="${VIEWBOX}" fill="url(#fade-ramp)"/></mask>`,
    ),
  },
  // In-app logo (login and sign-up screens): rounded corners.
  { file: 'images/logo.png', size: 512, svg: svg(rounded(full)) },
  // Google Play listing (uploaded by hand to the Play Console, not used by the app).
  { file: 'store/play-store-512.png', size: 512, svg: svg(full) },
];

for (const { file, size, svg: image } of outputs) {
  const png = new Resvg(image, { fitTo: { mode: 'width', value: size } })
    .render()
    .asPng();
  const path = join(ASSETS, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
  console.log(`✔ ${file} (${size}px)`);
}
