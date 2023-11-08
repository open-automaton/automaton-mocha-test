#!/usr/bin/env node
import { createRequire } from "module"; 
const require = createRequire(import.meta.url);
const logRunningOnClose = require('why-is-node-running');
const yargs = require('yargs');
const Mocha = require('mocha');
//const { it, describe } = require('mocha');
const express = require('express');
import { scanImports, setBaseDir } from '@environment-safe/import-introspect';
import { getPackage } from '@environment-safe/package';
import { bindContexts, registerRequire, getTestURL, testHTML, getRemote, mochaTool, scanPackage, setPackageArgs, setFixtures, fixturesLoaded } from '../src/mocha.mjs';
import { mochaEventHandler, setReciever, config } from '../src/index.mjs';
import * as fs from 'fs';
import * as path from 'path';
import * as parser from '@babel/parser';
// imports, totally as-advertised :P 
import traverseImport from '@babel/traverse';
import generatorImport from '@babel/generator';
const traverse = traverseImport.default;
const generator = generatorImport.default;

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
    .option('f', {
        alias: 'file',
        describe: 'use a file:// url instead of serving',
        type: 'string'
    })
    .option('p', {
        alias: 'prefix',
        default: '../',
        describe: 'prefix',
        type: 'string'
    })
    .option('q', {
        alias: 'require',
        describe: 'a local file which exports the require used for assembly',
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
    .option('h', {
        alias: 'head',
        describe: 'Show browser context while running',
        type: 'boolean'
    })
    .option('o', {
        alias: 'open',
        describe: 'leave the browser context running',
        type: 'boolean'
    })
    .option('t', {
        alias: 'strict',
        default: false,
        describe: 'Unforgiving about syntax and dependencies' ,
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
    
args.r = !args.t;
//make absolute before we shift to the test's dir to execute
if(args.s === '.') args.s = process.cwd();

const resolveTestSet = (passed)=>{
    const current = process.cwd();
    const results = [];
    if(passed.length){
        for(let lcv=0; lcv < passed.length; lcv++ ){
            if(passed[lcv][0] === '/' || passed[lcv].indexOf('://') !== -1){
                results.push(passed[lcv]);
            }else{
                results.push(path.join(current, passed[lcv]));
            }
        }
    }else{
        const testDir  = args._.pop() || 'test';
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
    try{
        if(args.v) console.log('MOKA RUNNING');
        setPackageArgs(args);
        setBaseDir('/');
        if(args.h){
            globalThis.forceHeadless = false;
        }
        if(args.v) console.log('INITIAL SCAN');
        const { prePkg } = await scanPackage(true, false, args.s);
        const requireLocation = (prePkg && prePkg.moka && prePkg.moka.require) || args.q;
        let rqr = require;
        let rslv = require.resolve;
        if(requireLocation){
            const imprt = await import(path.join(process.cwd(), requireLocation));
            rqr = imprt.require;
            rslv = imprt.resolve;
        }
        registerRequire(rqr, rslv);
        if(args.v) console.log('SECOND PASS SCAN');
        const { modules, pkg } = await scanPackage(true, true, args.s);
        const fixtures = {};
        const getFixture = async (name)=>{
            if(fixtures[name]) return fixtures[name];
            const { TestFixture } = await import(
                `${process.cwd()}/test/fixtures/${name}.mjs`
            );
            fixtures[name] = TestFixture;
            return TestFixture;
        };
        const setupFixtures = async ()=>{
            if(args.v) console.log('LAUNCHING FIXTURES', (new Error()).stack);
            const filesToAdd = resolveTestSet(args._);
            const fixtureSet = [];
            await Promise.all(filesToAdd.map((path)=>{
                const file = path.indexOf('file://') === 0?path.substring(7):path;
                return new Promise((resolve, reject)=>{
                    fs.readFile(file, async (err, body)=>{
                        if(err) return reject(err);
                        const ast = parser.parse(body.toString(), {
                            //todo: handle this for cross compile
                            sourceType: 'module',
                            plugins: [],
                        });
                        traverse(ast, {
                            CallExpression(path) {
                                if(path.node.callee.name === 'fixture'){
                                    const name = path.node.arguments[0].value;
                                    const settings = generator(path.node.arguments[1]).code;
                                    let data = '{}';
                                    eval('data = '+settings);
                                    const json = JSON.stringify(data);
                                    fixtureSet.push(new Promise(async (resolve, reject)=>{
                                        if(args.v) console.log(`FIXTURE ${name} LAUNCHED`);
                                        const ThisFixture = await getFixture(name);
                                        const fixture = new ThisFixture(data);
                                        fixture.name = name;
                                        await fixture.ready;
                                        resolve(fixture);
                                    }));
                                }
                            }
                        });
                        resolve();
                    });
                });
            }));
            const readyFixtures = await Promise.all(fixtureSet);
            setFixtures(readyFixtures);
            return readyFixtures;
        }
        let mocha = null;
        if(args.b){ //we're going to dummy the whole suite to the browser
            if(args.v) console.log('EXECUTING IN BROWSER');
            const url = getTestURL({ engine: args.b }).replace('8081', '8080');
            const remote = getRemote(args.b);
            setReciever(Mocha);
            mocha = mochaTool.init(Mocha, args, resolveTestSet, scanImports, logRunningOnClose);
            Mocha.instance = mocha;
            await setupFixtures();
            await mocha.tool.addAllFiles();
            remote.fetch({ url }, (err, html)=>{
                if(err) throw err;
            });
        }else{
            if(args.v) console.log('EXECUTING LOCALLY');
            // Standard mocha usage with optional per test callouts
            mocha = mochaTool.init(Mocha, args, resolveTestSet, scanImports, logRunningOnClose);
            await setupFixtures();
            await mocha.tool.addAllFiles();
        }
        const makeHTML = async ()=>{
            const testTags = (mocha.files || ['/test/test.mjs']).map(
                (file) =>{
                    const current = args.s || process.cwd();
                    const path = file.indexOf(current) === 0?file.substring(current.length):file;
                    return `<script type="module" src="${path}"></script>`
                }
            ).join('');
            const html = await testHTML(
                testTags,
                {
                    headless : !!args.b,
                    root: (args.s || process.cwd()),
                    map:`<script type="importmap"> { "imports": ${
                        JSON.stringify(modules, null, '    ') 
                    } }</script>`,
                    config: pkg.moka
                }
            );
            return html;
        };
        if(args.s || args.b){
            if(args.v) console.log('LAUNCHING SERVER');
            const app = express();
            const port = 8080;
            
            app.use(express.static(args.s))
            
            app.get('/test/index.html', async (req, res) => {
                //todo: support deno's deps
                const html = await makeHTML();
                res.send(html);
            });
            
            app.get('/fixtures.json', async (req, res) => {
                const fixtures = await fixturesLoaded();
                const result = [];
                fixtures.forEach((fixture)=> result.push({ name: fixture.name, options: fixture.options }));
                res.send(JSON.stringify(result));
            });
            
            app.get('/event', async (req, res) => {
                try{
                    if(req.query.engine){
                        const remote = getRemote(req.query.engine);
                        const selector = req.query.selector || 'body';
                        const action = req.query.type || 'click';
                        if(action === 'confirm'){
                            //setTimeout(()=>{
                                remote.type(['o'], ['Meta'], (err)=>{
                                    if(err){
                                        res.send(JSON.stringify({ success:false, error: err.message }));
                                    }else{
                                        res.send(JSON.stringify({ success:true }));
                                    }
                                });
                            //}, 3000); 
                        }
                        if(action === 'cancel'){
                            //todo: OS specific hotkeys?
                            remote.type(['Escape'], [], (err)=>{
                                if(err){
                                    res.send(JSON.stringify({ success:false, error: err.message }));
                                }else{
                                    res.send(JSON.stringify({ success:true }));
                                }
                            }); 
                        }
                        remote.trigger(action, selector, (err)=>{
                            if(err){
                                res.send(JSON.stringify({ success:false, error: err.message }));
                            }else{
                                res.send(JSON.stringify({ success:true }));
                            }
                        });
                    }
                    res.send(JSON.stringify({ success:true }));
                }catch(ex){
                    res.send(JSON.stringify({ success:false, error: ex.message }));
                }
            });
            
            app.get('/events.json', (req, res)=>{
                try{
                    //bindContexts
                    const result = bindContexts.map(
                        context=>context.events
                    ).reduce(
                        (list, local)=> list.concat(local)
                    );
                    res.send(JSON.stringify(result));
                }catch(ex){
                    console.log('!!!', ex);
                }
            });
            
            await new Promise((resolve)=>{
                app.listen(port, () => {
                    console.log(`Test server running on localhost @ ${port}`)
                    resolve();
                })
            });
        }
        if(args.f){
            if(args.v) console.log('SAVING HTML');
            console.log('SAVING HTML');
            const file = args.f.indexOf('file://') === 0?args.f.substring(7):args.f;
            await new Promise(async (resolve, reject)=>{
                const body = await makeHTML();
                fs.writeFile(file, body, (err)=>{
                    if(err) return reject(err);
                    resolve();
                })
            });
        }
        if(args.l){
            if(args.v) console.log('OPENING LOCAL BROWSER');
            const url = getTestURL({ }).replace('8081', '8080');
            //await setupFixtures();
            if(args.v) console.log(`open ${url}`);
            exec(`open ${url}`, (error, stdout, stderr) => { });
            return;
        }
        if(mocha && !args.l) mocha.tool.run();
    }catch(ex){
        console.log('ERROR', ex, '@');
    }
})();