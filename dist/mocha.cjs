"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.testRemote = exports.testHTML = exports.test = exports.setPackageArgs = exports.setFixtures = exports.setDefaultPort = exports.scanPackage = exports.registerRequire = exports.registerRemote = exports.mochaTool = exports.launchTestServer = exports.getTestURL = exports.getRemote = exports.generateTestBody = exports.fixturesLoaded = exports.fixture = exports.createDependencies = exports.configure = exports.config = exports.bindContexts = exports.bind = exports.Fixture = void 0;
var _runtimeContext = require("@environment-safe/runtime-context");
var _express = _interopRequireDefault(require("express"));
var mod = _interopRequireWildcard(require("module"));
var os = _interopRequireWildcard(require("os"));
var _package = require("@environment-safe/package");
var _file = require("@environment-safe/file");
var _index = require("../dist/index.cjs");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/* global describe:false, it:false */

/**
 * A JSON object
 * @typedef { object } JSON
 */

//import { isBrowser, isJsDom } from 'browser-or-node';

let _require = null;
let resolve = null;
const config = {
  //todo: defaults
};
exports.config = config;
const mochaTool = {
  init: (Mocha, args, resolveTestSet, scanImports, logRunningOnClose) => {
    const allImports = [];
    const addFile = async (mocha, fileName) => {
      const imports = await scanImports(fileName);
      imports.forEach(imprt => {
        if (allImports.indexOf(imprt) === -1) {
          allImports.push(imprt);
        }
      });
      return mocha.addFile(fileName);
    };
    const mocha = new Mocha();
    let workingDir = null; //TODO: support multiple files in multiple locations
    mocha.tool = {
      addAllFiles: async () => {
        const files = await resolveTestSet(args._);
        const work = [];
        let workingDir = null; //TODO: support multiple files in multiple locations
        for (let lcv = 0; lcv < files.length; lcv++) {
          work.push(addFile(mocha, files[lcv]));
          if (!workingDir) workingDir = _file.Path.parent(files[lcv]);
        }
        if (workingDir) {
          process.chdir(workingDir);
        }
        await Promise.all(work);
        await mocha.loadFilesAsync();
        return files;
      },
      run: () => {
        if (workingDir) {
          process.chdir(workingDir);
        }
        mocha.run(function (failures) {
          if (args.v || args.d) logRunningOnClose();
          if (!args.o) {
            if (!args.d) process.exit(failures);else {
              process.on('exit', function () {
                process.exit(failures ? 1 : 0); // exit with non-zero status if there were failures
              });
            }
          }
        });
      }
    };

    return mocha;
  }
};
exports.mochaTool = mochaTool;
const getCommonJS = (pkg, args) => {
  return args.p + ['node_modules', pkg.name, pkg.exports && pkg.exports['.'] && pkg.exports['.'].require ? pkg.exports['.'].require : (pkg.type === 'commonjs' || !pkg.type) && (pkg.commonjs || pkg.main) || pkg.commonjs || args.r && pkg.main].join('/');
};
const getModule = (pkg, args) => {
  return args.p + ['node_modules', pkg.name, pkg.exports && pkg.exports['.'] && pkg.exports['.'].import ? pkg.exports['.'].import : pkg.type === 'module' && (pkg.module || pkg.main) || pkg.module || args.r && pkg.main].join('/');
};
let args = {};
const setPackageArgs = value => {
  args = value;
};
exports.setPackageArgs = setPackageArgs;
const scanPackage = async (includeRemotes, includeDeps = true, root = './') => {
  const pkg = await (0, _package.getPackage)(root);
  if (!pkg) throw new Error('package read failed!');
  const dependencies = Object.keys(pkg.dependencies || []);
  const devDependencies = Object.keys(pkg.devDependencies || []);
  const seen = {};
  const mains = {};
  const modules = {};
  const locations = {};
  const list = dependencies.slice(0).concat(devDependencies.slice(0));
  let moduleName = null;
  let subpkg = null;
  let location = null;
  if (pkg.moka.stub && pkg.moka.stubs) {
    pkg.moka.stubs.forEach(stub => {
      modules[stub] = args.p + pkg.moka.stub;
    });
  }
  if (includeDeps) {
    //console.log('DEPS!')
    while (list.length) {
      moduleName = list.shift();
      try {
        if (!_require) _require = mod.createRequire(_require('url').pathToFileURL(__filename).toString());
        if (modules[moduleName]) continue;
        let thisPath = null;
        try {
          thisPath = resolve(moduleName);
        } catch (ex) {
          if (!remoteRequire) remoteRequire = mod.createRequire(_require('url').pathToFileURL(__filename).toString());
          if (remoteRequire) {
            thisPath = remoteRequire.resolve(moduleName);
          } else throw ex;
        }
        const parts = thisPath.split(`/${moduleName}/`);
        parts.pop();
        const localPath = parts.join(`/${moduleName}/`) + `/${moduleName}/`;
        subpkg = await (0, _package.getPackage)(localPath);
        if (!subpkg) throw new Error(`Could not find ${localPath}`);
        mains[moduleName] = getCommonJS(subpkg, args);
        seen[moduleName] = true;
        locations[moduleName] = location;
        modules[moduleName] = getModule(subpkg, args);
        Object.keys(subpkg.dependencies || {}).forEach(dep => {
          if (list.indexOf(dep) === -1 && !seen[dep]) {
            list.push(dep);
          }
        });
      } catch (ex) {
        if (args.v) console.log('FAILED', moduleName, ex);
      }
    }
  }
  if (includeRemotes) {
    if (!pkg.moka) throw new Error('.moka entry not found in package!');
    const headless = globalThis.forceHeadless === null ? pkg.moka.headless === null ? false : pkg.moka.headless : globalThis.forceHeadless;
    Object.keys(pkg.moka).forEach(key => {
      if (key === 'stub' || key === 'stubs' || key === 'require' || key === 'shims' || key === 'headless' || key === 'global-shims') return;
      const data = pkg.moka[key];
      const options = data.options || {};
      options.onConsole = (...args) => {
        let parsedArgs = null;
        if (typeof args[0] === 'string' && args[0][0] === '[' && (parsedArgs = JSON.parse(args[0])) && Array.isArray(parsedArgs) && typeof parsedArgs[0] === 'string') {
          //assume this is json-stream reporter output
          (0, _index.mochaEventHandler)(...parsedArgs);
        } else {
          console.log(...args);
        }
      };
      options.onError = event => {
        (0, _index.mochaEventHandler)(event);
      };
      options.headless = headless;
      registerRemote(key, data.engine, options);
    });
  }
  if (pkg.moka.stub && pkg.moka.stubs) {
    pkg.moka.stubs.forEach(stub => {
      modules[stub] = args.p + pkg.moka.stub;
    });
  }
  if (pkg.moka.shims) {
    Object.keys(pkg.moka.shims).forEach(shim => {
      modules[shim] = args.p + pkg.moka.shims[shim];
    });
  }
  if (!modules[pkg.name]) {
    modules[pkg.name] = "../dist/index.cjs";
  }
  return {
    modules,
    pkg
  };
};
exports.scanPackage = scanPackage;
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
let modules = null;
const launchTestServer = async (dir, port = 8084, test = "/test/test.cjs") => {
  //if(!require) require = mod.createRequire(import.meta.url);
  const app = (0, _express.default)();
  if (!modules) {
    modules = (await scanPackage(true, args, dir)).modules;
  }
  app.get('/test/index.html', async (req, res) => {
    try {
      const html = await testHTML('<script type="module" src="${test}"></script>', {
        headless: true,
        map: `<script type="importmap"> { "imports": ${JSON.stringify(modules, null, '    ')} }</script>`
      });
      res.send(html);
    } catch (ex) {
      console.log(ex);
    }
  });
  app.get('/fixtures.json', (req, res) => {
    const result = [];
    fixtures.forEach(fixture => result.push({
      name: fixture.name,
      options: fixture.options
    }));
    res.send(JSON.stringify(result));
  });
  app.get('/events.json', (req, res) => {
    try {
      //bindContexts
      const result = bindContexts.map(context => context.events).reduce((list, local) => list.concat(local));
      res.send(JSON.stringify(result));
    } catch (ex) {
      console.log('!!!', ex);
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
        <script type=module>
            import { detect } from 'detect-browser';
            const browser = detect();
            if((browser && (
                browser.name === 'safari' &&
                parseInt(browser.version) < 16
            )) || !browser){
                throw new Error('Safari < 16.4 not supported!');
            }
        </script>
        <script src="${mochaUrl}"></script>`;
  const init = options.init || `
        <script type="module">
            import { bind } from '@open-automaton/moka';
            window.moka = { bind };
            mocha.checkLeaks();
            mocha.globals([]);
            mocha.run();
        </script>
    `;
  const script = options.headless ? '<script>mocha.setup({ui:\'bdd\', reporter: \'json-stream\'})</script>' : '<script>mocha.setup(\'bdd\')</script>';
  //TODO: support test extraction
  const config = options.config || {};
  const mapIndent = '                ';
  const html = `
        <html>
            <head>
                <title>Moka Tests</title>
                <base filesystem="${options.root || process.cwd()}" user="${os.userInfo().username}">
                ${mochaLink}
                ${options.map.replace(/\n/g, '\n' + mapIndent) || ''}
                <script type="module">
                    (async ()=>{
                        window.fixtures = await (await fetch('/fixtures.json')).json();
                    })();
                    /*(async ()=>{
                        window.testEvents = await (await fetch('/events.json')).json();
                        window.testEvents.forEach((eventType)=>{
                            document.body.addEventListener(eventType, (event)=>{
                                console.log('event', JSON.stringify([eventType, event]) );
                            });
                        });
                    })();*/
                </script>
                ${(config['global-shims'] || []).map(url => `<script src="${url}"></script>`).join('')}
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
const counters = {};
class Fixture {
  static makePort(port) {
    if (!port) return 3000;
    if (typeof port === 'string' && port[port.length - 1] === '+') {
      //it's an auto-increment string
      if (!counters[port]) counters[port] = 0;
      return parseInt(port) + counters[port]++;
    }
    return parseInt(port);
  }
  constructor(options = {}) {
    this.options = options;
    this.ready = this.createFixture();
    (async () => {
      this.fixture = await this.ready;
    })();
  }
  async createFixture() {
    return await new Promise();
  }
  async destroyFixture() {
    return await new Promise();
  }
}
exports.Fixture = Fixture;
let fixtures = [];
const setFixtures = value => {
  fixtures = value;
};
exports.setFixtures = setFixtures;
const fixture = (name, settings, cb) => {
  if (_runtimeContext.isBrowser || _runtimeContext.isJsDom) {
    if (!window.fixtures) throw new Error('Fixtures failed to load!');
    const fixtures = window.fixtures;
    const fixture = fixtures.find(fix => fix.name === name);
    if (!fixture) throw new Error(`Fixture (${name}) failed to load!`);
    describe(`Fixture: ${fixture.name}`, () => {
      cb({}, fixture.options);
    });
  } else {
    const fixture = fixtures.find(fix => fix.name === name);
    if (!fixture) throw new Error(`Fixture (${name}) failed to load!`);
    describe(`Fixture: ${fixture.name}`, () => {
      cb({}, fixture.options);
    });
  }
};
exports.fixture = fixture;
const fixturesLoaded = async () => {
  Promise.all(fixtures.map(fixture => fixture.ready));
  return fixtures;
};
exports.fixturesLoaded = fixturesLoaded;
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
test.skip = (description, testLogicFn) => {
  it.skip(description, testLogicFn);
};
const remotes = {};
const engines = {};
const registerRequire = (rqr, rslv) => {
  _require = rqr;
  resolve = rslv;
};
exports.registerRequire = registerRequire;
let remoteRequire = null;
const registerRemote = (name, engineName, options = {}) => {
  if (!remoteRequire) remoteRequire = mod.createRequire(_require('url').pathToFileURL(__filename).toString());
  if (!engines[engineName]) engines[engineName] = remoteRequire(engineName);
  const instance = new engines[engineName](options);
  remotes[name] = instance;
};
exports.registerRemote = registerRemote;
let defaultPort = null;
let nextPort = null;
const setDefaultPort = port => {
  defaultPort = port;
  nextPort = defaultPort;
};
exports.setDefaultPort = setDefaultPort;
const remoteKeys = ['dialog'];
const inputQueue = [];

/*let inputHandler = (event, inputQueue)=>{
    if(inputQueue.length){
        const input = inputQueue.shift();
        try{
            input.handler(event, input.resolve, input.reject);
        }catch(ex){
            inputQueue.unshift(input);
        }
    }
};*/

let bindContexts = [];
exports.bindContexts = bindContexts;
const bindEventContext = (eventType, handler) => {
  if (_runtimeContext.isBrowser || _runtimeContext.isJsDom) {
    bindContexts.push({
      bind: context => {
        document.body.addEventListener(eventType, handler, false);
      },
      events: ['mousedown']
    });
    bindContexts[bindContexts.length - 1].bind();
  } else {
    bindContexts.push({
      bind: context => {},
      events: ['mousedown']
    });
  }
};

//EVENT BINDING
const bind = createContext => {
  const selector = '#dummy-button';
  const searchParams = new URLSearchParams(_runtimeContext.variables.location && _runtimeContext.variables.location.search);
  const actions = {
    click: async () => {
      await fetch(`/event?engine=${searchParams.get('engine')}&type=click&selector=${encodeURIComponent(selector)}`);
    },
    doubleclick: async () => {
      await fetch(`/event?engine=${searchParams.get('engine')}&type=doubleclick&selector=${encodeURIComponent(selector)}`);
    },
    rightclick: async () => {
      await fetch(`/event?engine=${searchParams.get('engine')}&type=rightclick&selector=${encodeURIComponent(selector)}`);
    }
  };
  const wantInput = async (type, id, handler) => {
    let entry = {
      handler
    };
    const promise = new Promise((resolve, reject) => {
      entry.resolve = resolve;
      entry.reject = reject;
      inputQueue.push(entry);
    });
    (async () => {
      //const searchParams = new URLSearchParams(window.location.search);
      /*const response = await fetch(`/event?engine=${
          searchParams.get('engine')
      }&type=${type}&selector=${
          encodeURIComponent(selector)
      }`);*/
      //const html = await response.text();
      //entry.resolve();
      const contextConfig = {
        type
      };
      if (config.wantsInput) {
        config.wantsInput(contextConfig, actions);
        if (config.dialog) {
          setTimeout(() => {
            config.dialog({}, {
              confirm: async () => {
                const response = await fetch(`/event?engine=${searchParams.get('engine')}&type=confirm&selector=${encodeURIComponent(selector)}`);
                const data = await response.json();
                if (data.success) {
                  console.log('this was a confirm');
                } else {
                  console.log('PROBLEM', data);
                }
              },
              cancel: async () => {}
            });
          }, 2000);
        }
      }
    })();
    const input = await promise;
    return await input;
  };
  const context = createContext(wantInput);
  Object.keys(context).forEach(eventType => {
    bindEventContext(eventType, event => {
      const contextConfig = {
        type: eventType
      };
      context[eventType](contextConfig, actions);
      const entry = inputQueue.shift();
      try {
        entry.resolve();
      } catch (ex) {
        inputQueue.unshift(entry);
      }
    });
  });
};
exports.bind = bind;
_runtimeContext.variables.moka = {
  bind
};
const configure = values => {
  Object.keys(values).forEach(key => {
    config[key] = values[key];
    if (remoteKeys.indexOf(key) !== -1) {
      Object.keys(remotes).forEach(remoteKey => {
        remotes[remoteKey].options[key] = values[key];
      });
    }
    if (key === 'downloads') {
      //TODO: remove this magical global
      globalThis.handleDownload = values[key];
    }
    if (key === 'write') {
      (0, _file.addEventListener)('write', values[key]);
    }
  });
};
exports.configure = configure;
setDefaultPort(8081);
const getTestURL = options => {
  const url = `http://${options.host || 'localhost'}:${options.port || defaultPort}/test/index.html?script=${options.caller || "test/test.cjs"}&engine=${options.engine || 'unknown'}&grep=${options.description ? encodeURIComponent(options.description) : ''}`;
  return url;
};
exports.getTestURL = getTestURL;
const getRemote = name => {
  if (!remotes[name]) throw new Error(`Remote '${name}' does not exist`);
  return remotes[name];
};
exports.getRemote = getRemote;
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
    if (!remotes[remoteName]) {
      it.skip(`🌎[${remoteName}] ${description}`, () => {});
      //throw new Error(`Remote '${remoteName}' was not found!`);
    } else {
      it(`🌎[${remoteName}] ${description}`, async function () {
        this.timeout(10000); //10s default
        const thisPort = defaultPort++;
        /*const server =*/
        await launchTestServer('../', thisPort, options.testScripts && options.testScripts[0]);
        if (!remotes[remoteName]) {
          throw new Error(`Remote '${remoteName}' was not found!`);
        }
        const url = getTestURL({
          port,
          caller,
          description: desc
        });
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
            //server.close();
          });
          //remotes[remoteName].
        });

        return result;
      });
    }
  } catch (ex) {
    console.log(ex);
  }
};
exports.testRemote = testRemote;