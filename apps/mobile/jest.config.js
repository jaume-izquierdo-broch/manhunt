// Tests run on jest-expo (simulates iOS by default). *.test.ts(x) files live next to the code.

/**
 * With pnpm, packages live under node_modules/.pnpm/<pkg>/node_modules/<pkg>, so
 * the pattern accepts that prefix. Everything listed is transformed by Babel
 * (React Native, Expo and libraries published as untranspiled source).
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
