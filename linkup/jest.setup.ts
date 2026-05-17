import '@testing-library/jest-dom';

// Polyfill Web API globals in Jest's JSDOM environment
if (typeof global.Request === 'undefined') {
  // Use Node's native Web APIs on globalThis
  Object.defineProperty(global, 'Request', {
    value: globalThis.Request,
    writable: true,
  });
}

if (typeof global.Response === 'undefined') {
  Object.defineProperty(global, 'Response', {
    value: globalThis.Response,
    writable: true,
  });
}

if (typeof global.Headers === 'undefined') {
  Object.defineProperty(global, 'Headers', {
    value: globalThis.Headers,
    writable: true,
  });
}
