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
 
import express from 'express';
import * as mod from 'module';
let require = null;

/*const fnToMochaTestBody = function(desc, fn){
     var body = fn.toString();
     var fileBody = `describe('test', function(){
         it('${desc}', ${body})
     })`;
     return new Function(fileBody);
 };*/
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
export const launchTestServer = (dir, port=8084, map)=>{
    const app = express();
    
    app.get('/test/index.html', async (req, res)=>{
        try{
            const html = await testHTML(
                '<script type="module" src="/test/test.mjs"></script>',
                {map}
            );
            res.send(html);
        }catch(ex){
            console.log(ex);   
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
    const mapIndent = '                ';
    const html = `
        <html>
            <head>
                <title>Moka Tests</title>
                ${mochaLink}
                ${options.map.replace(/\n/g, '\n'+mapIndent) || ''}
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

const remotes = {};
const engines = {};
export const registerRemote = (name, engineName, options={})=>{
    if(!require) require = mod.createRequire(import.meta.url);
    if(!engines[engineName]) engines[engineName] = require(engineName);
    const instance = new engines[engineName](options);
    remotes[name] = instance;
};

const defaultPort = 8080;
let nextPort = defaultPort;

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
        it(`🌎 ${description}`, async function(){
            this.timeout(10000); //10s default
            const server = await launchTestServer('./', port);
            if(!remotes[remoteName]){
                throw new Error(`Remote '${remoteName}' was not found!`);
            }
            const url = getTestURL({port, caller, description: desc});
            //console.log(remotes[remoteName])
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
                    server.close();
                });
            });
            console.log('>>>', result);
        });
    }catch(ex){
        console.log(ex);
    }
};