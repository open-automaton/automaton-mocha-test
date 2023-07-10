"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.testRemote = exports.testHTML = exports.test = exports.registerRemote = exports.launchTestServer = exports.getTestURL = exports.generateTestBody = exports.createDependencies = void 0;
var _express = _interopRequireDefault(require("express"));
var mod = _interopRequireWildcard(require("module"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/* global describe:false, it:false */
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

let _require = null;

/*const fnToMochaTestBody = function(desc, fn){
     var body = fn.toString();
     var fileBody = `describe('test', function(){
         it('${desc}', ${body})
     })`;
     return new Function(fileBody);
 };*/
const fnsToMochaTestBody = function (desc, fns, wrapInContext) {
  var body = '';
  if (wrapInContext) {
    body += 'describe(\'test\', function(){' + '\n';
  }
  fns.forEach(function (fn, index) {
    var name = fns.length === 1 ? desc : desc + '-' + (fn.name || index);
    var fnBody = fn.toString();
    body += `    it('${name}', ${fnBody})` + '\n';
  });
  if (wrapInContext) {
    body += '});';
  }
  return body;
};
const fnsToMochaTest = function (desc, fns, wrapInContext) {
  if (wrapInContext) {
    describe('peers-can', function () {
      fns.forEach(function (fn, index) {
        var name = fns.length === 1 ? desc : desc + '-' + (fn.name || index);
        it(name, fn);
      });
    });
  } else {
    fns.forEach(function (fn, index) {
      var name = fns.length === 1 ? desc : desc + '-' + (fn.name || index);
      it(name, fn);
    });
  }
};
const generateTestBody = (description, testLogicFn) => {
  return '' + fnsToMochaTestBody(description, [testLogicFn]) + '';
};
exports.generateTestBody = generateTestBody;
const launchTestServer = (dir, port = 8084, map) => {
  const app = (0, _express.default)();
  app.get('/test/index.html', async (req, res) => {
    try {
      const html = await testHTML("<script type=\"module\" src=\"/test/test.cjs\"></script>", {
        map
      });
      res.send(html);
    } catch (ex) {
      console.log(ex);
    }
  });
  return new Promise((resolve, reject) => {
    const server = app.listen(port, err => {
      if (err) reject(err);else resolve(server);
    });
  });
};
exports.launchTestServer = launchTestServer;
const createDependencies = async (options = {}) => {
  //const mode = options.mode || 'modules';
};
exports.createDependencies = createDependencies;
const testHTML = async (testTag, options = {}) => {
  //const testTag = generateTestBody(description, testLogicFn);
  const dependencies = await createDependencies({
    package: options.package,
    mode: options.mode
  });
  //const packageLocation = options.package || './package.json';
  const mochaLink = options.mocha || '<link rel="stylesheet" href="../node_modules/mocha/mocha.css">';
  const mochaUrl = options.mocha || '/node_modules/mocha/mocha.js';
  const testLibs = options.testLibs || `
        <div id="mocha"></div>
        <script src="${mochaUrl}"></script>`;
  const init = options.init || `
        <script type="module">
            mocha.checkLeaks();
            mocha.globals([]);
            mocha.run();
        </script>
    `;
  const script = options.headless ? '<script>mocha.setup({ui:\'bdd\', reporter: \'json-stream\'})</script>' : '<script>mocha.setup(\'bdd\')</script>';
  //TODO: support test extraction
  const mapIndent = '                ';
  const html = `
        <html>
            <head>
                <title>Moka Tests</title>
                ${mochaLink}
                ${options.map.replace(/\n/g, '\n' + mapIndent) || ''}
            </head>
            <body>
                ${testLibs}
                ${dependencies || ''}
                ${options.testLibs || script || ''}
                ${testTag}
                ${init}
            </body>
        <html>
    `;
  return html;
};
exports.testHTML = testHTML;
const test = (description, testLogicFn, clean) => {
  let fn;
  let decoratedDescription = `🏠 ${description}`;
  if (clean) {
    //context free (safe for isolated execution)
    const body = generateTestBody(decoratedDescription, testLogicFn);
    fn = new Function(body);
    fn();
  } else {
    fnsToMochaTest(decoratedDescription, [testLogicFn]);
  }
};
exports.test = test;
const remotes = {};
const engines = {};
const registerRemote = (name, engineName, options = {}) => {
  if (!_require) _require = mod.createRequire(_require('url').pathToFileURL(__filename).toString());
  if (!engines[engineName]) engines[engineName] = _require(engineName);
  const instance = new engines[engineName](options);
  remotes[name] = instance;
};
exports.registerRemote = registerRemote;
const defaultPort = 8080;
let nextPort = defaultPort;
const getTestURL = options => {
  const url = `http://${options.host || 'localhost'}:${options.port || defaultPort}/test/index.html?script=${options.caller || "test/test.cjs"}&grep=${options.description ? encodeURIComponent(options.description) : ''}`;
  return url;
};
exports.getTestURL = getTestURL;
const testRemote = (desc, testLogicFn, options) => {
  try {
    const caller = options.caller.split('/automaton-mocha-test/').pop();
    const parts = desc.split(':');
    const description = parts.pop();
    const remoteName = parts.shift();
    let port = parts.shift() || defaultPort;
    if (port.toString().trim() === '++') {
      port = nextPort++;
    }
    it(`🌎 ${description}`, async function () {
      this.timeout(10000); //10s default
      const server = await launchTestServer('./', port);
      if (!remotes[remoteName]) {
        throw new Error(`Remote '${remoteName}' was not found!`);
      }
      const url = getTestURL({
        port,
        caller,
        description: desc
      });
      //console.log(remotes[remoteName])
      const result = await new Promise((resolve, reject) => {
        remotes[remoteName].fetch({
          url
        }, (err, data) => {
          let match = null;
          if (err && typeof err === 'string' && (match = err.match(/<pre>.*<\/pre>/g))) {
            match = match[0].replace('<pre>', '').replace('</pre>', '');
            const error = new Error(`🌎 ${match}`);
            error.stack = 'Remote execution environment:?';
            return reject(error);
          }
          resolve(data);
          server.close();
        });
      });
      console.log('>>>', result);
    });
  } catch (ex) {
    console.log(ex);
  }
};
exports.testRemote = testRemote;