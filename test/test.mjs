/* global describe : false */
// this is so we can generate any number of dependencies
// but still end up with a very simple boilerplate that works everywhere
import { it, configure } from '../src/index.mjs';
import { chai } from '@environment-safe/chai';
import { intercept } from '@environment-safe/console-intercept';
const should = chai.should();
should.exist({});


describe('module', async ()=>{
    describe('performs a simple test suite', ()=>{
        
        it('loads', async ()=>{
            const outputs = [];
            const resetInput = intercept((str)=>{
                outputs.push(str);
                return '';
            });
            console.log('foo');
            resetInput();
            outputs.length.should.equal(1);
            outputs[0].trim().should.equal('foo');
        });
        
        it('firefox:loads', async ()=>{
            const outputs = [];
            const resetInput = intercept((str)=>{
                outputs.push(str);
                return '';
            });
            console.log('foo2');
            resetInput();
            outputs.length.should.equal(1);
            outputs[0].trim().should.equal('foo2');
        });
        
        it.skip('skipped test is skipped', ()=>{ });
    });
    
    describe.skip('uses a different configuration', ()=>{
        it('dismisses a popup', async ()=>{
            configure({
                dialog : (context, actions)=>{
                    console.log('dialog');
                    actions.confirm();
                } 
            });
            alert(); //this should be dismissed so the test completes
        });
    });
});