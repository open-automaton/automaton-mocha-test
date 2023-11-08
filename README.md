Moka
====
A mocha test runner with browsers baked in, designed for native esmodule development across many environments using a common test suite and no boilerplate. It supports standard execution, executing a full suite in a remote (browser) environment, executing individual tests in the browser or scraper scripts to validate the final state of your HTML. Most importantly it builds the import map for you, by scanning the dependency tree so you just run your suite the same way you do locally.

Best coupled with [environment-safe modules](https://github.com/environment-safe).

Configuration
-------------

### The Easy Way
Create a project using [@environment-safe/template](https://github.com/environment-safe/template).

when you are done you can run `npm run browser-test` to launch an interactive test in your browser, `npm run headless-browser-test` to run the suite in chrome, firefox and safari (all powered by `moka`) and then `npm run import-test` to run a standard mocha test.

Everything's set up and ready to go.

### From Scratch

Use the [custom configuration docs](docs/scratch.md) to integrate `moka` into your own project/boilerplate/framework.

Usage
-----
Moka gives you access to a few new verbs, in addition to adjusting some of the behavior of the existing ones. One major restriction is *all* test names must be unique. Other than this and client/server interactions, it behaves like `mocha`.

### `interactive()`
In some cases there are OS restrictions preventing the logic from being testable any other way but interactively. In those cases you can use `interactive` in place of `it` and the tests will be run or skipped based on the headless settings or environment.

### `configure()`
`configure()` calls must be run outside the `it()` call to take effect (we can't configure the browser if we're *in* the browser!).

### `config.dialog`
In some cases you will need to normalize between browser and serve flow differences, one of the primary obstacles is dialogs. `moka` handles this by letting you configure a `dialog` handler which is invoked in environments where it's relevant (the browser). For example, the following code auto-OKs every dialog window:

```javascript
configure({
    dialog : (context, actions)=>{
        actions.confirm();
    } 
});
```

### `config.wantsInput`
Some actions in the browser are required to initiate from a user spawned event, we allow for generating these needed action on-the-fly (often these actions result in a dialog, making `wantsInput` work in conjunction with `dialog`)

```javascript
configure({
    wantsInput : (context, actions)=>{
        if(context.type === 'click') actions.click();
    } 
});
```

### `config.downloads`
You'll also note that you can take action on downloads

```javascript
configure({
    downloads : (download)=>{
        // do something with download.text() or download.arrayBuffer()
    } 
});
```

### `config.write`
Similar to downloads you can take action on file write

```javascript
configure({
    write : (meta)=>{
        // do something with meta.text() or meta.arrayBuffer()
    } 
});
```

### Fixtures
In other cases you need a service to be available when the script is executed, but you want to *define* the service config in the script itself. this catch-22 is one of the main things that leads people to bolt on things to mocha and build their own alternate, but-almost-the-same test technology. Standard Mocha fixtures continue to work, but are challenging to use for cross environment contexts.

For example, a `hello-world-server` fixture would be at: `test/fixtures/hello-world-server.mjs`

```javascript
// a minimal server
import { Fixture } from '@open-automaton/moka';
import express from 'express';

// *always* named `TestFixture`
export class TestFixture extends Fixture{
    async createFixture(){
        const app = express();
        app.get('/hello', async (req, res) => {
            res.send('world');
        });
        // if you give this a string ending with '+' it increments the port each time
        this.options.port = Fixture.makePort(this.options.port);
        return await new Promise((resolve, reject)=>{
            try{
                const server = app.listen(this.options.port, (err) => {
                    if(err) return reject(err);
                    resolve(server);
                });
            }catch(ex){ reject(ex); }
        });
    }
}
```

In the client script you just need to reference the fixture and provide a config (which *must* be a literal):

```javascript
import { it, fixture } from '@open-automaton/moka';
import { chai } from '@environment-safe/chai';
const should = chai.should();

describe('my-test', ()=>{
    fixture('hello-world-server', { port: '8083+' }, (context, config)=>{
        it('supplies world, given hello', async ()=>{
            try{
                const result = await (await fetch(
                    `http://localhost:${config.port}/hello`
                )).text();
                should.exist(result);
                result.should.equal('world');
            }catch(ex){
                should.not.exist(ex);
            }
        });
    });
});
```

Now you have a fixture that works in both client and server modes.

### Minimal Example

```javascript
import { it } from '@open-automaton/moka';
import { chai } from '@environment-safe/chai';
const should = chai.should();

describe('environment tests', ()=>{
    describe('global objects', ()=>{
        it('object exists', async ()=>{
            should.exist(Object);
        });
    });
});
```

Running the suite
-----------------

### Browser targeting by run

In this scenario you have a full test suite which is run in *all* environments (This is the recommended way to work), and you provide the environment you want to run in to the test runner. and you'll get console output from each run.

### Browser targeting by test

In this scenario you have an integrated test suite (something like a regression suite), where you want to guarantee conformance across a series of isolated scenarios to prevent regressions in those specific instances. In this case the `it()` function allows the user to specify a `moka` target (defined in your project's package.json) (EX: if I have an entry for `firefox`, I can write a test that targets it with `it('firefox: my test description', ()=>{ /* ... */ } )`). 

You can test with `moka` in one of 4 ways:

### Mocha

Because `moka` is built on top of mocha, all tests remain compatible and can be run directly (remote tests are skipped)

```bash
    mocha test/foo.mjs
```

### OS default browser

This allows you to interactively test using the standard reporter in your browser

```bash
    moka --server . --local-browser test/foo.mjs
```

### Headless browser target

This runs in a headless browser instance and proxies all the results to a dummy suite executing locally so you still have local access

```bash
    moka --browser <target> test/foo.mjs
```

and if I wanted to be able to inspect the output during/after the run:

```bash
    moka --browser <target> test/foo.mjs --open --head
```

### Individual browser tests

Run a standard mocha test suite, only jobbing out individual tests to headless browser instances as prefixed on the test description itself. Situations you might want to use this strategy include: a component with a conformance suite where specific browsers are prone to specific issues, functions or behaviors or rely on browser specific interfaces or behaviors (Basic conformance and feature testing is best using a common suite which is then used in a variety of environments).

```bash
    moka test/foo.mjs
```

### Output

The only real difference in the local output will be icons to show where the tests executed or an environment specific failure in the tests.

Roadmap
-------

- [x] - simpler defaults (relaxed by default, and prefix to ..)
- [x] - download handling, `wantsInput` handler for user input
- [x] - `interactive()`
- [x] - head state exposed, stay open exposed
- [ ] - jsdoc (build exists, just need docs)
- [ ] - integrate wing-kong (share import-map scan+build logic)
- [ ] - project init
- [ ] - OS multiplexing (through containers) 
- [ ] - rhino runtime support
- [ ] - deno runtime support
- [ ] - bun runtime support


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

