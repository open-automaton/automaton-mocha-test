Moka
====
A mocha test runner with browsers baked in, designed for native esmodule development across many environments using a common test suite and no boilerplate. It supports standard execution, executing a full suite in a remote (browser) environment, executing individual tests in the browser or scraper scripts to validate the final state of your HTML. Most importantly it builds the import map for you, by scanning the dependency tree so you just run your suite the same way you do locally.

Best coupled with [environment-safe modules](https://github.com/environment-safe).

Configuration - The Easy Way
----------------------------

Create a project using [@environment-safe/template](https://github.com/environment-safe/template).

when you are done you can run `npm run browser-test` to launch an interactive test in your browser, `npm run headless-browser-test` to run the suite in chrome, firefox and safari (all powered by `moka`) and then `npm run import-test` to run a standard mocha test.

Everything's set up and ready to go.

Configuration - From Scratch
----------------------------

First, unless you are using shims, moka **requires** that your local paths match your repo names. If your projects directory is `/devroot` then module `foo` should be at `/devroot/foo/` and `@bar/baz` must be at `/devroot/@bar/baz`. If you are using multiple instances of projects, you'll need to set up a symlinking scheme yourself.

 You'll also need a dependency, [detect-browser](https://www.npmjs.com/package/detect-browser) :
 
 ```bash
 npm install --save-dev detect-browser
 ```

Before using `moka` you need to add it's configuration to your `package.json` you need to define a set of targets as well as any packages you will be stubbing ( substituting a dummy module for, because it isn't actually in the executed browser code path) and shimming (providing an explicit location for a given package). `moka`'s own `package.json` is [a good example of how this might look](https://github.com/open-automaton/moka/blob/master/package.json#L53-L83), because the package tests itself.

In addition *all* tests must have a unique name

the easiest path is to set up a simple `.moka` entry then test interactively for problematic dependencies. My hope is that the need for stubs and shims subsides over time.

Usage
-----
Given the following test script in `test/foo.mjs`:

```javascript
import { it, configure } from '@open-automaton/moka';
import { chai } from 'environment-safe-chai';
const should = chai.should();

describe('environment tests', async ()=>{
    describe('global objects', ()=>{
        it('object exists', async ()=>{
            configure({
                foo: "bar"
            });
            should.exist(Object);
        });
        
        it('chrome:array exists', async ()=>{
            should.exist(Array);
        });
    });
});
```

You can test with `moka` in one of 4 ways:

### Mocha

Because `moka` is built on top of mocha, all tests remain compatible and can be run directly (remote tests are skipped)

```bash
    mocha test/foo.mjs
```

### OS default browser

This allows you to interactively test using the standard reporter in your browser

```bash
    moka --server . --local-browser --relaxed --prefix ../ test/foo.mjs
```

### Headless browser target

This runs in a headless browser instance and proxies all the results to a dummy suite executing locally so you still have local access

```bash
    moka --browser <target> --relaxed --prefix ../ test/foo.mjs
```

### Individual browser tests

Run a standard mocha test suite, only jobbing out individual tests to headless browser instances as prefixed on the test description itself. Situations you might want to use this strategy include: a component with a conformance suite where specific browsers are prone to specific issues, functions or behaviors or rely on browser specific interfaces or behaviors (Basic conformance and feature testing is best using a common suite which is then used in a variety of environments).

```bash
    moka --relaxed --prefix ../ test/foo.mjs
```

### Output

The only real difference in the local output will be icons to show where the tests executed or an environment specific failure in the tests.

Testing
-------

Run the es module tests to test the root modules
```bash
npm run import-test
```
to run the same test inside the browser:

```bash
npm run browser-test
```
to run the same test headless in chrome, firefox and safari:
```bash
npm run headless-browser-test
```

to run the same test inside docker:
```bash
npm run container-test
```

Run the commonjs tests against the `/dist` commonjs source (generated with the `build-commonjs` target).
```bash
npm run require-test
```

Development
-----------
All work is done in the .mjs files and will be transpiled on commit to commonjs and tested.

If the above tests pass, then attempt a commit which will generate .d.ts files alongside the `src` files and commonjs classes in `dist`

