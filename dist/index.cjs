"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setReciever = exports.mochaEventHandler = exports.itRemotely = exports.it = exports.hashString = exports.configure = exports.config = void 0;
var _browserOrNode = require("browser-or-node");
var _mocha = require("./mocha.cjs");
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
  try {
    if (type.message && type.stack) {
      //it's an error
    } else {
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
        case 'fail':
          if (waiting[event.title]) {
            const handle = waiting[event.title];
            delete waiting[event.title];
            const error = new Error();
            error.message = event.err;
            error.stack = event.stack;
            error.target = event;
            handle.reject(error);
          } else {
            console.log('unknown event', type, event);
          }
          break;
        case 'start':
        case 'end':
      }
    }
  } catch (ex) {
    console.log('::', ex);
  }
};

//https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/mocha/index.d.ts#L490-L543
exports.mochaEventHandler = mochaEventHandler;
const it = (str, fn) => {
  try {
    const description = typeof str === 'string' ? str : '';
    const handler = typeof str === 'function' ? str : fn;
    const caller = new Error().stack.split('\n')[1].split('//').slice(-1)[0].split(':')[0];
    if (isReciever) {
      if (_browserOrNode.isBrowser || _browserOrNode.isJsDom) {
        throw new Error('Reciever mode unsupported in the browser');
      } else {
        const contract = new Promise((resolve, reject) => {
          try {
            waiting[description] = {
              resolve,
              reject
            };
          } catch (ex) {
            reject(ex);
          }
        });
        isReciever.it('🌎 ' + description, async function () {
          //todo: dynamic timeout
          this.timeout(15000);
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
  } catch (ex) {
    console.log(ex, '???');
    throw ex;
  }
};
exports.it = it;
it.skip = (description, handler) => {
  if (_browserOrNode.isBrowser || _browserOrNode.isJsDom) {
    window.it.skip(description, handler);
  } else {
    return _mocha.test.skip(description, handler);
  }
}; // noop

const config = {
  //todo: defaults
};
exports.config = config;
const configure = values => {
  Object.keys(values).forEach(key => {
    config[key] = values[key];
  });
};
exports.configure = configure;
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