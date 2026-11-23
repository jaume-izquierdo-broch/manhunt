// Tests con jest-expo (simula iOS por defecto). Los *.test.ts(x) viven junto al código.

/**
 * Con pnpm los paquetes están en node_modules/.pnpm/<pkg>/node_modules/<pkg>,
 * así que el patrón acepta ese prefijo. Todo lo listado se transforma con Babel
 * (React Native, Expo y librerías publicadas sin compilar).
 */
const transformPackages = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  'expo(nent)?',
  '@expo(nent)?/.*',
  'expo-router',
  'react-native-maps',
  'react-navigation',
  '@react-navigation/.*',
  '@manhunt/.*',
];

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  transformIgnorePatterns: [
    `node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?(${transformPackages.join('|')}))`,
  ],
};
