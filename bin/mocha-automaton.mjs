#!/usr/bin/env node
import { createRequire } from "module"; 
const require = createRequire(import.meta.url);
const logRunningOnClose = require('why-is-node-running');
const yargs = require('yargs');
const Mocha = require('mocha');
const express = require('express');
import { scanImports, setBaseDir } from 'environment-safe-import-introspect/src/index.mjs';
import { getPackage } from 'environment-safe-package/src/environment-safe-package.mjs';
import * as fs from 'fs';
import * as path from 'path';
const Automaton = require('@open-automaton/automaton');
const CheerioEngine = require('@open-automaton/cheerio-mining-engine');
const PuppeteerEngine = require('@open-automaton/puppeteer-mining-engine');
const PlaywrightEngine = require('@open-automaton/playwright-mining-engine');
// {type:'chromium'}, {type:'firefox'}, {type:'webkit'}
const JSDomEngine = require('@open-automaton/jsdom-mining-engine');


const args = yargs
    .scriptName('mocha-automaton')
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
    .option('v', {
        alias: 'verbose',
        default: false,
        describe: 'the path to serve as root',
        type: 'boolean'
    })
    .help()
    .argv;
    

const scanPackage = async()=>{
    const pkg = await getPackage();
    const dependencies = Object.keys(pkg.dependencies || []);
    const seen = {};
    const mains = {};
    const modules = {};
    const locations = {};
    const list = dependencies.slice(0);
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
            console.log(subpkg)
            mains[moduleName] = (subpkg.type === 'module' && !subpkg.module)?`/${moduleName}/${subpkg.main}`:'';
            seen[moduleName] = true;
            locations[moduleName] = location;
            modules[moduleName] = (
                subpkg.type === 'module' && 
                (subpkg.module  || subpkg.main) 
            ) || subpkg.module;
            Object.keys(subpkg.dependencies || {}).forEach((dep)=>{
                if(list.indexOf(dep) === -1 && !seen[dep]){
                    list.push(dep);
                }
            });
        }catch(ex){
            console.log('FAILED', moduleName, ex)
        }
    }
    console.log(modules)
    if(!pkg['mocha-automaton']) throw new Error('.mocha-automaton entry not found in package!');
    Object.keys(pkg['mocha-automaton']).forEach((key)=>{
        const data = pkg['mocha-automaton'][key];
        
        console.log('>>', key, data)
    });
    
};
    
(async ()=>{
    setBaseDir('/');
    await scanPackage();
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
    
    if(passed.length){
        for(let lcv=0; lcv < passed.length; lcv++ ){
            if(passed[lcv][0] === '/'){
                await addFile(passed[lcv]);
            }else{
                await addFile(path.join(current, passed[lcv]));
            }
        }
    }else{
        const dir = fs.readdirSync(testDir);
        if(fs.existsSync('/test.js')){ //root test script
            await addFile(
                path.join(current, 'test.js')
            );
        }else{ // /test subdirectory
            const work = [];
            dir.filter(function(file){
                // Only keep the .js files
                return file.substr(-3) === '.js';
        
            }).forEach((file)=>{
                work.push(addFile(
                    path.join(testDir, file)
                ));
            });
            await Promise.all(work);
        }
    }
    await mocha.loadFilesAsync();
    if(args.s){
        const app = express();
        const port = 3000
        
        app.get('/test/index.html', (req, res) => {
            
        })
        
        await new Promise((resolve)=>{
            app.listen(port, () => {
                resolve();
            })
        });
    }
    mocha.run(function(failures){
        if(args.v) logRunningOnClose();
        process.on('exit', function () {
            process.exit(failures);  // exit with non-zero status if there were failures
        });
    });
})()
