// Genera todos los iconos de la app a partir del logo vectorial.
//
//   pnpm --filter @manhunt/mobile icons
//
// El logo es un pin de ubicación (escapador, verde) dentro de una mira (cazador, rojo).
// Para cambiar colores o formas, edita las constantes y vuelve a ejecutar el script.
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

const COLORS = {
  hunter: '#E5484D',
  runner: '#30A46C',
  backgroundTop: '#1C2030',
  backgroundBottom: '#0B0D12',
  /** Color de fondo del splash y del icono adaptativo (el más oscuro). */
  solid: '#0F1117',
};

/**
 * Marca (mira + pin) en un lienzo de 1024 centrada en (512, 512).
 * `scale` encoge la marca hacia el centro (zona segura de Android, splash...).
 */
function mark({ scale = 1, hunter = COLORS.hunter, runner = COLORS.runner }) {
  const tick = (x1, y1, x2, y2) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hunter}" stroke-width="44" stroke-linecap="round"/>`;
  return `
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <circle cx="512" cy="512" r="330" fill="none" stroke="${hunter}" stroke-width="44"/>
    ${tick(512, 92, 512, 232)}
    ${tick(512, 792, 512, 932)}
    ${tick(92, 512, 232, 512)}
    ${tick(792, 512, 932, 512)}
    <!-- Pin con agujero real (evenodd): se ve el fondo a través. -->
    <path fill="${runner}" fill-rule="evenodd"
      d="M512 712 C 448 628 384 570 384 474 A 128 128 0 1 1 640 474 C 640 570 576 628 512 712 Z
         M562 472 A 50 50 0 1 0 462 472 A 50 50 0 1 0 562 472 Z"/>
  </g>`;
}

const background = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${COLORS.backgroundTop}"/>
      <stop offset="1" stop-color="${COLORS.backgroundBottom}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>`;

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${body}</svg>`;

/** Variantes del logo -> archivo PNG y tamaño. */
const outputs = [
  // Icono principal (iOS lo recorta solo con esquinas redondeadas).
  { file: 'images/icon.png', size: 1024, svg: svg(background + mark({ scale: 0.86 })) },
  // Android adaptativo: el sistema recorta la capa delantera; la marca va en la zona segura (66 %).
  { file: 'images/android-icon-foreground.png', size: 1024, svg: svg(mark({ scale: 0.6 })) },
  { file: 'images/android-icon-background.png', size: 1024, svg: svg(background) },
  // Android 13+ "iconos temáticos": una sola tinta que el sistema colorea.
  {
    file: 'images/android-icon-monochrome.png',
    size: 432,
    svg: svg(mark({ scale: 0.6, hunter: '#FFFFFF', runner: '#FFFFFF' })),
  },
  // Splash: la marca sola sobre el color de fondo (lo pinta Expo).
  { file: 'images/splash-icon.png', size: 512, svg: svg(mark({ scale: 1 })) },
  // Logo dentro de la app (pantallas de login/registro).
  { file: 'images/logo.png', size: 512, svg: svg(mark({ scale: 1 })) },
  { file: 'images/favicon.png', size: 48, svg: svg(background + mark({ scale: 0.86 })) },
];

for (const { file, size, svg: source } of outputs) {
  const png = new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();
  const path = join(ROOT, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
  console.log(`✔ ${file} (${size}px)`);
}

// Fuente vectorial, por si se necesita en otro sitio (web, redes, tienda...).
writeFileSync(join(ROOT, 'logo.svg'), svg(background + mark({ scale: 0.86 })));
console.log('✔ logo.svg');
