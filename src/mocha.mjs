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
 
import * as express from 'express';

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
export const launchTestServer = (dir, port=8084)=>{
    const app = express();
    
    app.get('/', (req, res)=>{
        
    });
    
    app.listen(port);
};
export const createDependencies = async (options={})=>{
    //const mode = options.mode || 'modules';
};
export const testHTML = async (description, testLogicFn, options={})=>{
    const test = generateTestBody(description, testLogicFn);
    const dependencies = await createDependencies({
        package: options.package,
        mode: options.mode
    });
    //const packageLocation = options.package || './package.json';
    const mochaUrl = options.mocha || 'https://cdn.rawgit.com/mochajs/mocha/2.2.5/mocha.js';
    const chaiUrl = options.mocha || 'https://cdn.rawgit.com/mochajs/mocha/2.2.5/mocha.js';
    const testLibs = options.testLibs ||`
        <div id="mocha"></div>
        <script src="${mochaUrl}"></script>
        <script src="${chaiUrl}"></script>`;
    const init = options.init || `
        <script>
            mocha.checkLeaks();
            mocha.globals([]);
            mocha.run();
        </script>
    `;
    const script = '<script>mocha.setup({ui:\'bdd\', reporter: \'json-stream\'})</script>';
    const html = `
        <html>
            <head>
            </head>
            <body>
                ${testLibs}
                ${dependencies}
                ${ options.testLibs || script }
                ${test}
                ${init}
            </body>
        <html>
    `;
    return html;
};

export const test = (description, testLogicFn, clean)=>{
    let fn;
    if(clean){
        //context free (safe for isolated execution)
        const body = generateTestBody(description, testLogicFn);
        fn = new Function(body);
        fn();
    }else{
        fnsToMochaTest(description, [testLogicFn]);
    }
};