#!/usr/bin/env node
import { createRequire } from "module"; 
const require = createRequire(import.meta.url);
const logRunningOnClose = require('why-is-node-running');
const yargs = require('yargs');
const Mocha = require('mocha');
//const { it, describe } = require('mocha');
const express = require('express');
import { scanImports, setBaseDir } from 'environment-safe-import-introspect/src/index.mjs';
import { getPackage } from 'environment-safe-package/src/environment-safe-package.mjs';
import { registerRemote, getTestURL, testHTML, getRemote, mochaTool, scanPackage, setPackageArgs } from '../src/mocha.mjs';
import { mochaEventHandler, setReciever } from '../src/index.mjs';
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
    .option('b', {
        alias: 'browser',
        describe: 'Load all tests in a browser context',
        type: 'string'
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
    setPackageArgs(args);
    setBaseDir('/');
    const { modules } = await scanPackage(true);
    if(args.s || args.b){
        const app = express();
        const port = 8080;
        
        app.use(express.static('.'))
        
        app.get('/test/index.html', async (req, res) => {
            const html = await testHTML(
                `<script type="module" src="/test/test.mjs"></script>`,
                {
                    headless : !!args.b,
                    map:`<script type="importmap"> { "imports": ${
                        JSON.stringify(modules, null, '    ') 
                    } }</script>`
                }
            );
            res.send(html);
        });
        
        await new Promise((resolve)=>{
            app.listen(port, () => {
                console.log(`Test server running on localhost @ ${port}`)
                resolve();
            })
        });
    }
    if(args.l){
        const url = getTestURL({ }).replace('8081', '8080');;
        exec(`open ${url}`, (error, stdout, stderr) => { });
        return;
    }
    if(args.b){ //we're going to dummy the whole suite to the browser
        const url = getTestURL({ }).replace('8081', '8080');
        const remote = getRemote(args.b);
        setReciever(Mocha);
        const mocha = mochaTool.init(Mocha, args, resolveTestSet, scanImports, logRunningOnClose);
        await mocha.tool.addAllFiles();
        mocha.tool.run();
        remote.fetch({ url }, (err, html)=>{
            if(err) throw err;
        });
    }else{
        // Standard mocha usage with optional per test callouts
        const mocha = mochaTool.init(Mocha, args, resolveTestSet, scanImports, logRunningOnClose);
        await mocha.tool.addAllFiles();
        mocha.tool.run();
    }
})();
