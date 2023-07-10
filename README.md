automaton-mocha-test
============================
A mocha test runner with additional functionality designed for native esmodule development across many environments using a single test suite and no boilerplate. It supports standard execution, executing a full suite in a remote (browser) environment, executing individual tests in the browser or scraper scripts to validate the final state of your HTML. 

Best coupled with [environment-safe modules](https://github.com/environment-safe).

Usage
-----



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
to run the same test headless in chrome:
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

