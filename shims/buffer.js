// Buffer polyfill for React Native
import { Buffer } from 'buffer';

// Make Buffer available globally for React Native
if (typeof global !== 'undefined') {
  global.Buffer = Buffer;
}

// Also make it available on window for web compatibility
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

export default Buffer;