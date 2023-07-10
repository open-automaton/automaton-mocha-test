/*
import { isBrowser, isJsDom } from 'browser-or-node';
import * as mod from 'module';
import * as path from 'path';
let internalRequire = null;
if(typeof require !== 'undefined') internalRequire = require;
const ensureRequire = ()=> (!internalRequire) && (internalRequire = mod.createRequire(import.meta.url));
//*/
import { isBrowser, isJsDom } from 'browser-or-node';
import { test, testRemote } from './mocha.mjs';
/**
 * A JSON object
 * @typedef { object } JSON
 */
 
export const it = (str, fn)=>{
    const description = (typeof str === 'string' )?str:'';
    const handler = (typeof str === 'function' )?str:fn;
    const caller = (new Error()).stack.split('\n')[1].split('//').slice(-1)[0].split(':')[0];
    if(isBrowser || isJsDom){
        //console.log('BROWSER', window.it, description, handler);
        window.it(description, handler);
    }else{
        if(description.indexOf(':') !== -1){
            //console.log('REMOTE');
            return itRemotely(description, handler, { caller });
        }else{
            //console.log('LOCAL');
            return test(description, handler);
        }
    }
};


export const hashString = (str)=>{
    let theHash = 0, i, chr;
    if(str.length === 0) return theHash;
    for(i = 0; i < str.length; i++){
        chr = str.charCodeAt(i);
        theHash = ((theHash << 5) - theHash) + chr;
        theHash |= 0; // Convert to 32bit integer
    }
    return theHash;
};

export const itRemotely = (description, handler, options)=>{
    return testRemote(description, handler, options);
};