import { URLSearchParams } from 'node:url';
import { transferableAbortController } from 'node:util';

// Fix JSDOM/Node URLSearchParams mismatch that breaks fetch in tests
// JSDOM provides its own URLSearchParams implementation, but fetch expects Node's native version.
// This polyfill replaces the global URLSearchParams with Node's implementation to ensure compatibility.

// Node fetch also requires native AbortSignals rather than JSDOM's implementation.
const nativeAbortController = transferableAbortController();

Object.defineProperties(globalThis, {
  URLSearchParams: { value: URLSearchParams },
  AbortController: { value: nativeAbortController.constructor },
  AbortSignal: { value: nativeAbortController.signal.constructor },
});
