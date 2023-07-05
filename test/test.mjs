/* global describe:false, it:false */
import { itRemotely, it } from '../src/index.mjs';
// this is so we can generate any number of dependencies
// but still end up with a very simple boilerplate that works everywhere
import { chai } from 'environment-safe-chai';
import { intercept } from 'environment-safe-console-intercept';

describe('module', async ()=>{
    describe('performs a simple test suite', ()=>{
        it('loads', async ()=>{
            const resetInput = intercept(()=>{
                
            });
            console.log('foo');
            resetInput();
        });
        itRemotely('loads:firefox', async ()=>{
            console.log('foo2');
        });
    });
});