Configuration - From Scratch
============================

First, unless you are using shims, moka **requires** that your local paths match your repo names. If your projects directory is `/devroot` then module `foo` should be at `/devroot/foo/` and `@bar/baz` must be at `/devroot/@bar/baz`. If you are using multiple instances of projects, you'll need to set up a symlinking scheme yourself.

 You'll also need a dependency, [detect-browser](https://www.npmjs.com/package/detect-browser) :
 
 ```bash
 npm install --save-dev detect-browser
 ```

Before using `moka` you need to add it's configuration to your `package.json` you need to define a set of targets as well as any packages you will be stubbing ( substituting a dummy module for, because it isn't actually in the executed browser code path) and shimming (providing an explicit location for a given package). `moka`'s own `package.json` is [a good example of how this might look](https://github.com/open-automaton/moka/blob/master/package.json#L53-L83), because the package tests itself.

In addition *all* tests must have a unique name

the easiest path is to set up a simple `.moka` entry then test interactively for problematic dependencies. My hope is that the need for stubs and shims subsides over time.

