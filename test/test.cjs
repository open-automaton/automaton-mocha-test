// running this is mostly meaningless
const should = require('chai').should();
const intercept = require('intercept-stdout');
const { } = require('../dist/index.cjs');

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
    });
});
