// Add polyfills at the very top
import 'react-native-get-random-values';
import './shims/buffer.js';

// Add Array.includes polyfill for older JavaScript engines
if (typeof Array.prototype.includes === 'undefined') {
  Array.prototype.includes = function(search) {
    return this.indexOf(search) !== -1;
  };
}

// Add String.includes polyfill
if (typeof String.prototype.includes === 'undefined') {
  String.prototype.includes = function(search) {
    return this.indexOf(search) !== -1;
  };
}

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
