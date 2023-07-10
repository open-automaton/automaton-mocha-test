#!/usr/bin/env node
import { createRequire } from "module"; 
const require = createRequire(import.meta.url);
const logRunningOnClose = require('why-is-node-running');
const yargs = require('yargs');
const Mocha = require('mocha');
const express = require('express');
import { scanImports, setBaseDir } from 'environment-safe-import-introspect/src/index.mjs';
import { getPackage } from 'environment-safe-package/src/environment-safe-package.mjs';
import { registerRemote, getTestURL, testHTML } from '../src/mocha.mjs';
import * as fs from 'fs';
import * as path from 'path';
const Automaton = require('@open-automaton/automaton');
const CheerioEngine = require('@open-automaton/cheerio-mining-engine');
const PuppeteerEngine = require('@open-automaton/puppeteer-mining-engine');
const PlaywrightEngine = require('@open-automaton/playwright-mining-engine');
// {type:'chromium'}, {type:'firefox'}, {type:'webkit'}
const JSDomEngine = require('@open-automaton/jsdom-mining-engine');
const { exec } = require("child_process");


const args = yargs
    .scriptName('moka')
    .usage('$0 <cmd> [args]')
    .option('m', {
        alias: 'mode',
        default: 'module',
        choices: ['module', 'globals'],
        describe: 'the type of output to construct',
        type: 'string'
    })
    .option('s', {
        alias: 'serve',
        default: '.',
        describe: 'the path to serve as root',
        type: 'string'
    })
    .option('p', {
        alias: 'prefix',
        default: '/',
        describe: 'prefix',
        type: 'string'
    })
    .option('d', {
        alias: 'dangling-promises',
        default: false,
        describe: 'show dangling promises on termination',
        type: 'boolean'
    })
    .option('l', {
        alias: 'local-browser',
        default: false,
        describe: 'Load in the system\'s default browser',
        type: 'boolean'
    })
    .option('r', {
        alias: 'relaxed',
        default: false,
        describe: 'If no module is available, try main' ,
        type: 'boolean'
    })
    .option('v', {
        alias: 'verbose',
        default: false,
        describe: 'the path to serve as root',
        type: 'boolean'
    })
    .help()
    .argv;

const getCommonJS = (pkg)=>{
    if(pkg.moka)
    return args.p + ['node_modules', pkg.name, (
        (pkg.exports && pkg.exports['.'] && pkg.exports['.'].require)?
        pkg.exports['.'].require:
        ((
            (pkg.type === 'commonjs' || !pkg.type)  && 
            (pkg.commonjs  || pkg.main) 
        ) || pkg.commonjs || (args.r && pkg.main))
    )].join('/')
};

const getModule = (pkg)=>{
    return args.p + ['node_modules', pkg.name, (
        (pkg.exports && pkg.exports['.'] && pkg.exports['.'].import)?
        pkg.exports['.'].import:
        ((
            pkg.type === 'module' && 
            (pkg.module  || pkg.main) 
        ) || pkg.module || (args.r && pkg.main))
    )].join('/')
};

const scanPackage = async()=>{
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
    while(list.length){
        moduleName = list.shift();
        try{
            const thisPath = require.resolve(moduleName);
            const parts = thisPath.split(`/${moduleName}/`);
            parts.pop();
            const localPath = parts.join(`/${moduleName}/`) + `/${moduleName}/`;
            subpkg = await getPackage(localPath);
            if(!subpkg) throw new Error(`Could not find ${localPath}`)
            mains[moduleName] = getCommonJS(subpkg);
            seen[moduleName] = true;
            locations[moduleName] = location;
            modules[moduleName] = getModule(subpkg);
            Object.keys(subpkg.dependencies || {}).forEach((dep)=>{
                if(list.indexOf(dep) === -1 && !seen[dep]){
                    list.push(dep);
                }
            });
        }catch(ex){
            if(args.v) console.log('FAILED', moduleName, ex)
        }
    }
    if(!pkg.moka) throw new Error('.moka entry not found in package!');
    Object.keys(pkg.moka).forEach((key)=>{
        if(key === 'stub' || key === 'stubs' || key === 'shims') return;
        const data = pkg.moka[key];
        registerRemote(key, data.engine, data.options || {});
    });
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
    return { modules };
};

const resolveTestSet = (passed)=>{
    const current = process.cwd();
    const results = [];
    if(passed.length){
        for(let lcv=0; lcv < passed.length; lcv++ ){
            if(passed[lcv][0] === '/'){
                results.push(passed[lcv]);
            }else{
                results.push(path.join(current, passed[lcv]));
            }
        }
    }else{
        const dir = fs.readdirSync(testDir);
        if(fs.existsSync('/test.js')){ //root test script
            results.push( path.join(current, 'test.js') );
        }else{ // /test subdirectory
            const work = [];
            dir.filter(function(file){
                // Only keep the .js files
                return file.substr(-3) === '.js' || 
                    file.substr(-4)    === '.mjs' ||
                    file.substr(-4)    === '.cjs';
        
            }).forEach((file)=>{
                results.push(
                    path.join(testDir, file)
                );
            });
        }
    }
    return results;
};
    
(async ()=>{
    setBaseDir('/');
    const { modules } = await scanPackage();
    if(args.s){
        const app = express();
        const port = 8080;
        
        app.use(express.static('.'))
        
        app.get('/test/index.html', async (req, res) => {
            const html = await testHTML(
                `<script type="module" src="/test/test.mjs"></script>`,
                {
                    map:`<script type="importmap"> { "imports": ${
                        JSON.stringify(modules, null, '    ') 
                    } }</script>`
                }
            );
            res.send(html);
        });
        
        await new Promise((resolve)=>{
            app.listen(port, () => {
                console.log(`>>> ${port}`)
                resolve();
            })
        });
    }
    if(args.l){
        const url = getTestURL({ });
        exec(`open ${url}`, (error, stdout, stderr) => { });
        return;
    }
    // Instantiate a Mocha instance.
    const mocha = new Mocha();
    const current = process.cwd();
    const testDir = current+'/test';
    
    const passed = args._;
    
    const allImports = [];
    
    const addFile = async (fileName)=>{
        const imports = await scanImports(fileName);
        imports.forEach((imprt)=>{
            if(allImports.indexOf(imprt) === -1){
                allImports.push(imprt);
            }
        });
        return mocha.addFile(fileName);
    };
    
    const files = await resolveTestSet(args._);
    const work = [];
    for(let lcv =0; lcv < files.length; lcv++){
        work.push(addFile(files[lcv]));
    }
    await Promise.all(work);
    await mocha.loadFilesAsync();
    mocha.run(function(failures){
        if(args.v || arg.d) logRunningOnClose();
        if(!arg.d) process.exit(failures);
        else{
            process.on('exit', function(){
                process.exit(failures);  // exit with non-zero status if there were failures
            });
        }
    });
})();
