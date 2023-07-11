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


let isReciever = false;
let waiting = {};

export const setReciever = (handle)=>{
    isReciever = handle;
};

export const mochaEventHandler = (type, event)=>{
    switch(type){
        case 'pass':
            if(waiting[event.title]){
                const handle = waiting[event.title];
                delete waiting[event.title];
                handle.resolve();
            }else{
                console.log('unknown event', type, event);
            }
            break;
        case 'start':
        case 'end':
    }
};
 
export const it = (str, fn)=>{
    const description = (typeof str === 'string' )?str:'';
    const handler = (typeof str === 'function' )?str:fn;
    const caller = (new Error()).stack.split('\n')[1].split('//').slice(-1)[0].split(':')[0];
    if(isReciever){
        if(isBrowser || isJsDom){
            throw new Error('Reciever mode unsupported in the browser');
        }else{
            const contract = new Promise((resolve, reject)=>{
                waiting[description] = {resolve, reject};
            });
            isReciever.it(description, async function(){
                this.timeout(5000);
                await contract;
            });
        }
    }else{
        if(isBrowser || isJsDom){
            window.it(description, handler);
        }else{
            if(description.indexOf(':') !== -1){
                return itRemotely(description, handler, { caller });
            }else{
                return test(description, handler);
            }
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