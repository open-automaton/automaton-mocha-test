"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.itRemotely = exports.it = exports.hashString = void 0;
var _browserOrNode = require("browser-or-node");
var _mocha = require("./mocha.cjs");
/*
import { isBrowser, isJsDom } from 'browser-or-node';
import * as mod from 'module';
import * as path from 'path';
let internalRequire = null;
if(typeof require !== 'undefined') internalRequire = require;
const ensureRequire = ()=> (!internalRequire) && (internalRequire = mod.createRequire(import.meta.url));
//*/

/**
 * A JSON object
 * @typedef { object } JSON
 */

const it = (str, fn) => {
  const description = typeof str === 'string' ? str : '';
  const handler = typeof str === 'function' ? str : fn;
  const caller = new Error().stack.split('\n')[1].split('//').slice(-1)[0].split(':')[0];
  if (_browserOrNode.isBrowser || _browserOrNode.isJsDom) {
    //console.log('BROWSER', window.it, description, handler);
    window.it(description, handler);
  } else {
    if (description.indexOf(':') !== -1) {
      //console.log('REMOTE');
      return itRemotely(description, handler, {
        caller
      });
    } else {
      //console.log('LOCAL');
      return (0, _mocha.test)(description, handler);
    }
  }
};
exports.it = it;
const hashString = str => {
  let theHash = 0,
    i,
    chr;
  if (str.length === 0) return theHash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    theHash = (theHash << 5) - theHash + chr;
    theHash |= 0; // Convert to 32bit integer
  }

  return theHash;
};
exports.hashString = hashString;
const itRemotely = (description, handler, options) => {
  return (0, _mocha.testRemote)(description, handler, options);
};
exports.itRemotely = itRemotely;