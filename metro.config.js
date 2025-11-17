
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Use turborepo to restore the cache when possible
config.cacheStores = [
  new FileStore({ root: path.join(__dirname, 'node_modules', '.cache', 'metro') }),
];

// Enable package exports resolution
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: true,
  // Ensure proper resolution of node_modules
  nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
};

// Optimize transformer for better performance
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    compress: {
      drop_console: false,
    },
  },
};

// Increase max workers for better build performance
config.maxWorkers = 2;

module.exports = config;
