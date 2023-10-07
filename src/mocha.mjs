/* global describe:false, it:false */

/**
 * A JSON object
 * @typedef { object } JSON
 */
 
import { isBrowser, isJsDom } from 'browser-or-node';
import express from 'express';
import * as mod from 'module';
import * as os from 'os';
import { getPackage } from '@environment-safe/package';
import { mochaEventHandler } from '../src/index.mjs';
let require = null;
let resolve = null;

export const mochaTool = {
    init : (Mocha, args, resolveTestSet, scanImports, logRunningOnClose)=>{
        const allImports = [];
        const addFile = async (mocha, fileName)=>{
            const imports = await scanImports(fileName);
            imports.forEach((imprt)=>{
                if(allImports.indexOf(imprt) === -1){
                    allImports.push(imprt);
                }
            });
            return mocha.addFile(fileName);
        };
        const mocha = new Mocha();
        mocha.tool = {
            addAllFiles : async ()=>{
                const files = await resolveTestSet(args._);
                const work = [];
                for(let lcv =0; lcv < files.length; lcv++){
                    work.push(addFile(mocha, files[lcv]));
                }
                
                await Promise.all(work);
                await mocha.loadFilesAsync();
                return files;
            },
            run : ()=>{
                mocha.run(function(failures){
                    
                    if(args.v || args.d) logRunningOnClose();
                    if(!args.d) process.exit(failures);
                    else{
                        process.on('exit', function(){
                            process.exit(failures);  // exit with non-zero status if there were failures
                        });
                    }
                });
            },
            
        };
        return mocha;
    }
};

const getCommonJS = (pkg, args)=>{
    return args.p + ['node_modules', pkg.name, (
        (pkg.exports && pkg.exports['.'] && pkg.exports['.'].require)?
            pkg.exports['.'].require:
            ((
                (pkg.type === 'commonjs' || !pkg.type)  && 
                (pkg.commonjs  || pkg.main) 
            ) || pkg.commonjs || (args.r && pkg.main))
    )].join('/');
};

const getModule = (pkg, args)=>{
    return args.p + ['node_modules', pkg.name, (
        (pkg.exports && pkg.exports['.'] && pkg.exports['.'].import)?
            pkg.exports['.'].import:
            ((
                pkg.type === 'module' && 
                (pkg.module  || pkg.main) 
            ) || pkg.module || (args.r && pkg.main))
    )].join('/');
};

let args = {};
export const setPackageArgs = (value)=>{
    args = value;
};


export const scanPackage = async(includeRemotes, includeDeps=true)=>{
    const pkg = await getPackage();
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
    if(pkg.moka.stub && pkg.moka.stubs){
        pkg.moka.stubs.forEach((stub)=>{
            modules[stub] = args.p + pkg.moka.stub;
        });
    }
    if(includeDeps){
        //console.log('DEPS!')
        while(list.length){
            moduleName = list.shift();
            try{
                if(!require) require = mod.createRequire(import.meta.url);
                if(modules[moduleName]) continue;
                let thisPath = null;
                try{
                    thisPath = resolve(moduleName);
                }catch(ex){
                    if(!remoteRequire) remoteRequire = mod.createRequire(import.meta.url);
                    if(remoteRequire){
                        thisPath = remoteRequire.resolve(moduleName);
                    }else throw ex;
                }
                const parts = thisPath.split(`/${moduleName}/`);
                parts.pop();
                const localPath = parts.join(`/${moduleName}/`) + `/${moduleName}/`;
                subpkg = await getPackage(localPath);
                if(!subpkg) throw new Error(`Could not find ${localPath}`);
                mains[moduleName] = getCommonJS(subpkg, args);
                seen[moduleName] = true;
                locations[moduleName] = location;
                modules[moduleName] = getModule(subpkg, args);
                Object.keys(subpkg.dependencies || {}).forEach((dep)=>{
                    if(list.indexOf(dep) === -1 && !seen[dep]){
                        list.push(dep);
                    }
                });
            }catch(ex){
                if(args.v)  
                    console.log('FAILED', moduleName, ex);
            }
        }
    }
    if(includeRemotes){
        if(!pkg.moka) throw new Error('.moka entry not found in package!');
        Object.keys(pkg.moka).forEach((key)=>{
            if(
                key === 'stub' || 
                key === 'stubs' || 
                key === 'require' || 
                key === 'shims' || 
                key === 'global-shims'
            ) return;
            const data = pkg.moka[key];
            const options = data.options || {};
            options.onConsole = (...args)=>{
                let parsedArgs = null;
                if(
                    typeof args[0] === 'string' &&
                    args[0][0] === '[' && 
                    ( parsedArgs = JSON.parse(args[0]) ) && 
                    Array.isArray(parsedArgs) && 
                    typeof parsedArgs[0] === 'string'
                ){
                    //assume this is json-stream reporter output
                    mochaEventHandler(...parsedArgs);
                }else{
                    console.log(...args);
                }
            };
            options.onError = (event)=>{
                mochaEventHandler(event);
            };
            registerRemote(key, data.engine, options);
        });
    }
    if(pkg.moka.stub && pkg.moka.stubs){
        pkg.moka.stubs.forEach((stub)=>{
            modules[stub] = args.p + pkg.moka.stub;
        });
    }
    if(pkg.moka.shims){
        Object.keys(pkg.moka.shims).forEach((shim)=>{
            modules[shim] = args.p + pkg.moka.shims[shim];
        });
    }
    return { modules, pkg };
};

const fnsToMochaTestBody = function(desc, fns, wrapInContext){
    var body = '';
    if(wrapInContext){
        body += 'describe(\'test\', function(){'+'\n';
    }
    fns.forEach(function(fn, index){
        var name = fns.length === 1?desc:desc + '-'+(fn.name || index);
        var fnBody = fn.toString();
        body += `    it('${name}', ${fnBody})`+'\n';
    });
    if(wrapInContext){
        body += '});';
    }
    return body;
};
const fnsToMochaTest = function(desc, fns, wrapInContext){
    if(wrapInContext){
        describe('peers-can', function(){
            fns.forEach(function(fn, index){
                var name = fns.length === 1?desc:desc + '-'+(fn.name || index);
                it(name, fn);
            });
        });
    }else{
        fns.forEach(function(fn, index){
            var name = fns.length === 1?desc:desc + '-'+(fn.name || index);
            it(name, fn);
        });
    }
};
export const generateTestBody = (description, testLogicFn)=>{
    return ''+fnsToMochaTestBody(description, [testLogicFn])+'';
};

let modules = null;
export const launchTestServer = async (dir, port=8084, test='/test/test.mjs')=>{
    //if(!require) require = mod.createRequire(import.meta.url);
    const app = express();
    if(!modules){
        modules = (await scanPackage(true, args)).modules;
    }
    app.get('/test/index.html', async (req, res)=>{
        try{
            const html = await testHTML(
                '<script type="module" src="${test}"></script>',
                {
                    headless : true,
                    map:`<script type="importmap"> { "imports": ${
                        JSON.stringify(modules, null, '    ') 
                    } }</script>`
                }
            );
            res.send(html);
        }catch(ex){
            console.log(ex);   
        }
    });
    app.get('/fixtures.json', (req, res)=>{
        try{
            const result = [];
            fixtures.forEach((fixture)=> result.push({ name: fixture.name, options: fixture.options }));
            res.send(JSON.stringify(result));
        }catch(ex){
            console.log('!!!', ex);
        }
    });
    return new Promise((resolve, reject)=>{
        const server = app.listen(port, (err)=>{
            if(err) reject(err);
            else resolve(server);
        });
    });
};
export const createDependencies = async (options={})=>{
    //const mode = options.mode || 'modules';
};
export const testHTML = async (testTag, options={})=>{
    //const testTag = generateTestBody(description, testLogicFn);
    const dependencies = await createDependencies({
        package: options.package,
        mode: options.mode
    });
    //const packageLocation = options.package || './package.json';
    const mochaLink = options.mocha || '<link rel="stylesheet" href="../node_modules/mocha/mocha.css">';
    const mochaUrl = options.mocha || '/node_modules/mocha/mocha.js';
    const testLibs = options.testLibs ||`
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
                mocha.checkLeaks();
                mocha.globals([]);
                mocha.run();
        </script>
    `;
    const script = options.headless?
        '<script>mocha.setup({ui:\'bdd\', reporter: \'json-stream\'})</script>':
        '<script>mocha.setup(\'bdd\')</script>';
    //TODO: support test extraction
    const config = options.config || {};
    const mapIndent = '                ';
    const html = `
        <html>
            <head>
                <title>Moka Tests</title>
                <base filesystem="${process.cwd()}" user="${os.userInfo().username}">
                ${mochaLink}
                ${options.map.replace(/\n/g, '\n'+mapIndent) || ''}
                <script type="module">
                    (async ()=>{
                        window.fixtures = await (await fetch('/fixtures.json')).json();
                    })();
                </script>
                ${(config['global-shims'] || []).map((url)=> `<script src="${url}"></script>` ).join('')}
            </head>
            <body>
                ${testLibs}
                ${dependencies || ''}
                ${ options.testLibs || script || '' }
                ${testTag}
                ${init}
            </body>
        <html>
    `;
    return html;
};

const counters = {};
export class Fixture{
    static makePort(port){
        if(!port) return 3000;
        if(typeof port === 'string' && port[port.length-1] === '+'){
            //it's an auto-increment string
            if(!counters[port]) counters[port] = 0;
            return parseInt(port) + (counters[port]++);
        }   
        return parseInt(port);
    }
    constructor(options={}){
        this.options = options;
        this.ready = this.createFixture();
        (async ()=>{
            this.fixture = await this.ready;
        })();
    }
    
    async createFixture(){
        return await new Promise();
    }
    
    async destroyFixture(){
        return await new Promise();
    }
    
}

let fixtures = [];
export const setFixtures = (value)=>{
    fixtures = value;
};

export const fixture = (name, settings, cb)=>{
    if(isBrowser || isJsDom){
        if(!window.fixtures) throw new Error('Fixtures failed to load!');
        const fixtures = window.fixtures;
        const fixture = fixtures.find((fix) => fix.name === name);
        if(!fixture) throw new Error(`Fixture (${name}) failed to load!`);
        describe(`Fixture: ${fixture.name}`, ()=>{
            cb({}, fixture.options);
        });
    }else{
        const fixture = fixtures.find((fix) => fix.name === name);
        if(!fixture) throw new Error(`Fixture (${name}) failed to load!`);
        describe(`Fixture: ${fixture.name}`, ()=>{
            cb({}, fixture.options);
        });
    }
};

export const fixturesLoaded = async ()=>{
    Promise.all(fixtures.map((fixture)=> fixture.ready ));
    return fixtures;
};

export const test = (description, testLogicFn, clean)=>{
    let fn;
    let decoratedDescription = `🏠 ${description}`;
    if(clean){
        //context free (safe for isolated execution)
        const body = generateTestBody(decoratedDescription, testLogicFn);
        fn = new Function(body);
        fn();
    }else{
        fnsToMochaTest(decoratedDescription, [testLogicFn]);
    }
};

test.skip = (description, testLogicFn)=>{
    it.skip(description, testLogicFn);
};

const remotes = {};
const engines = {};

export const registerRequire = (rqr, rslv)=>{
    require = rqr;
    resolve = rslv;
};

let remoteRequire = null;

export const registerRemote = (name, engineName, options={})=>{
    if(!remoteRequire) remoteRequire = mod.createRequire(import.meta.url);
    if(!engines[engineName]) engines[engineName] = remoteRequire(engineName);
    const instance = new engines[engineName](options);
    remotes[name] = instance;
};

let defaultPort = null;
let nextPort = null;

export const setDefaultPort = (port)=>{
    defaultPort = port;
    nextPort = defaultPort;
};

export const config = {
    //todo: defaults
};

const remoteKeys = ['dialog'];

export const configure = (values)=>{
    Object.keys(values).forEach((key)=>{
        config[key] = values[key];
        if(remoteKeys.indexOf(key) !== -1){
            Object.keys(remotes).forEach((remoteKey)=>{
                remotes[remoteKey].options[key] = values[key];
            });
        }
    });
};

setDefaultPort(8081);

export const getTestURL = (options)=>{
    const url = `http://${
        options.host || 'localhost'
    }:${
        options.port || defaultPort
    }/test/index.html?script=${
        options.caller || 'test/test.mjs'
    }&grep=${
        options.description?
            encodeURIComponent(options.description):
            ''
    }`;
    return url;
};

export const getRemote = (name)=>{
    if(!remotes[name]) throw new Error(`Remote '${name}' does not exist`);
    return remotes[name];
};

export const testRemote = (desc, testLogicFn, options)=>{
    try{
        const caller = options.caller.split('/automaton-mocha-test/').pop();
        const parts = desc.split(':');
        const description = parts.pop();
        const remoteName = parts.shift();
        let port = parts.shift() || defaultPort;
        if( port.toString().trim() === '++' ){
            port = nextPort++;
        }
        if(!remotes[remoteName]){
            it.skip(`🌎[${remoteName}] ${description}`, ()=>{});
            //throw new Error(`Remote '${remoteName}' was not found!`);
        }else{
            it(`🌎[${remoteName}] ${description}`, async function(){
                this.timeout(10000); //10s default
                const thisPort = defaultPort++;
                /*const server =*/ await launchTestServer('./', thisPort, (
                    options.testScripts && options.testScripts[0]
                ));
                if(!remotes[remoteName]){
                    throw new Error(`Remote '${remoteName}' was not found!`);
                }
                const url = getTestURL({port, caller, description: desc});
                const result = await new Promise((resolve, reject)=>{
                    remotes[remoteName].fetch({ url }, (err, data)=>{
                        let match = null;
                        if(err && typeof err === 'string' && (match = err.match(/<pre>.*<\/pre>/g))){
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
    }catch(ex){
        console.log(ex);
    }
};