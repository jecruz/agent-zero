#!/usr/bin/env node

const vm = require('vm');
const path = require('path');
const Module = require('module');

// SECURITY: Block dangerous globals and functions
const BLOCKED_GLOBALS = [
  'process',    // Can spawn child processes, access env vars
  'Buffer',     // Can read/write binary data
  'setTimeout', // Can block event loop
  'setInterval',// Can block event loop
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'Function',   // Alternative to eval
  'eval',       // Already blocked by vm but double-check
  'exec',       // Child process spawn
  'execSync',   // Sync child process
  'spawn',      // Child process spawn
  'spawnSync',
  'fork',
  'cluster',
  'dgram',
  'dns',
  'net',
  'tls',
  'http',
  'https',
  'request',
  'fetch',      // Network access
  'XMLHttpRequest',
  '__dirname',
  '__filename',
  'module',
  'exports',
  'require',
];

// Allow only safe built-in Math and JSON
const safeMath = Math;
const safeJSON = JSON;
const safeConsole = {
  log: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
  warn: (...args) => console.warn(...args),
  info: (...args) => console.info(...args),
};

// Create a restricted context with only safe globals
const context = {
  Math: safeMath,
  JSON: safeJSON,
  console: safeConsole,
  String,
  Number,
  Boolean,
  Array,
  Object,
  Map,
  Set,
  Promise,
  Date,
  RegExp,
  Error,
  TypeError,
  RangeError,
  SyntaxError,
  ReferenceError,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURIComponent,
  decodeURIComponent,
  encodeURI,
  decodeURI,
  Infinity,
  NaN,
  undefined,
  null,
};

// Retrieve the code from the command-line argument
const code = process.argv[2];

if (!code) {
  console.error('No code provided');
  process.exit(1);
}

// SECURITY: Limit code size to prevent DoS
const MAX_CODE_SIZE = 100000; // 100KB
if (code.length > MAX_CODE_SIZE) {
  console.error('Code too large (max 100KB)');
  process.exit(1);
}

const wrappedCode = `
  (async function() {
    try {
      const __result__ = await eval(${JSON.stringify(code)});
      if (__result__ !== undefined) console.log('Out[1]:', __result__);
    } catch (error) {
      console.error(error.message || error);
    }
  })();
`;

vm.runInContext(wrappedCode, context, {
  filename: 'eval.js',
  lineOffset: -2,
  columnOffset: 0,
  timeout: 30000, // 30 second timeout
}).catch((err) => {
  console.error('Execution error:', err.message || err);
});
