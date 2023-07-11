/* global describe : false */
// this is so we can generate any number of dependencies
// but still end up with a very simple boilerplate that works everywhere
import { it } from '../src/index.mjs';
import { chai } from 'environment-safe-chai';
import { intercept } from 'environment-safe-console-intercept';
const should = chai.should();
should.exist({});

describe('module', async ()=>{
    describe('performs a simple test suite', ()=>{
        it('loads', async ()=>{
            const outputs = [];
            const resetInput = intercept((str)=>{
                outputs.push(str);
            });
            console.log('foo');
            resetInput();
            outputs.length.should.equal(1);
            outputs[0].trim().should.equal('foo');
        });
        
        it('firefox:loads', async ()=>{
            console.log('foo2');
        });
    });
});