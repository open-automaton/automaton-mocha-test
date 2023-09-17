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
    try{
        if(type.message && type.stack){
            //it's an error
        }else{
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
                case 'fail':
                    if(waiting[event.title]){
                        const handle = waiting[event.title];
                        delete waiting[event.title];
                        const error = new Error();
                        error.message = event.err;
                        error.stack = event.stack;
                        error.target = event;
                        handle.reject(error);
                    }else{
                        console.log('unknown event', type, event);
                    }
                    break;
                case 'start':
                case 'end':
            }
        }
    }catch(ex){
        console.log('::', ex);
    }
};
 
//https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/mocha/index.d.ts#L490-L543
export const it = (str, fn)=>{
    try{
        const description = (typeof str === 'string' )?str:'';
        const handler = (typeof str === 'function' )?str:fn;
        const caller = (new Error()).stack.split('\n')[1].split('//').slice(-1)[0].split(':')[0];
        if(isReciever){
            if(isBrowser || isJsDom){
                throw new Error('Reciever mode unsupported in the browser');
            }else{
                const contract = new Promise((resolve, reject)=>{
                    try{
                        waiting[description] = { resolve, reject };
                    }catch(ex){
                        reject(ex);
                    }
                });
                isReciever.it('🌎 '+description, async function(){
                    //todo: dynamic timeout
                    this.timeout(15000);
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
    }catch(ex){
        console.log(ex, '???');
        throw ex;
    }
};

it.skip = (description, handler)=>{
    if(isBrowser || isJsDom){
        window.it.skip(description, handler);
    }else{
        return test.skip(description, handler);
    }
}; // noop

export const config = {
    //todo: defaults
};

export const configure = (values)=>{
    Object.keys(values).forEach((key)=>{
        config[key] = values[key];
    });
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