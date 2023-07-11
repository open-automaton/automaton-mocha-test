"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setReciever = exports.mochaEventHandler = exports.itRemotely = exports.it = exports.hashString = void 0;
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

let isReciever = false;
let waiting = {};
const setReciever = handle => {
  isReciever = handle;
};
exports.setReciever = setReciever;
const mochaEventHandler = (type, event) => {
  switch (type) {
    case 'pass':
      if (waiting[event.title]) {
        const handle = waiting[event.title];
        delete waiting[event.title];
        handle.resolve();
      } else {
        console.log('unknown event', type, event);
      }
      break;
    case 'start':
    case 'end':
  }
};
exports.mochaEventHandler = mochaEventHandler;
const it = (str, fn) => {
  const description = typeof str === 'string' ? str : '';
  const handler = typeof str === 'function' ? str : fn;
  const caller = new Error().stack.split('\n')[1].split('//').slice(-1)[0].split(':')[0];
  if (isReciever) {
    if (_browserOrNode.isBrowser || _browserOrNode.isJsDom) {
      throw new Error('Reciever mode unsupported in the browser');
    } else {
      const contract = new Promise((resolve, reject) => {
        waiting[description] = {
          resolve,
          reject
        };
      });
      isReciever.it(description, async function () {
        this.timeout(5000);
        await contract;
      });
    }
  } else {
    if (_browserOrNode.isBrowser || _browserOrNode.isJsDom) {
      window.it(description, handler);
    } else {
      if (description.indexOf(':') !== -1) {
        return itRemotely(description, handler, {
          caller
        });
      } else {
        return (0, _mocha.test)(description, handler);
      }
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