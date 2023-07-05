
/*let legalErrorNames;
const unpromisify = (func)=>{
    return function(){ //handles promises or callback via magic
        legalErrorNames = [ 'err', 'error', 'ex', 'er' ];
        var cb;
        var result;
        var fns = Array.prototype.slice.call(arguments);
        //todo, ensure
        var lastFnArgs = typeof fns[fns.length-1] === 'function'?getFnArgs(fns[fns.length-1]):[];
        if(legalErrorNames.indexOf(lastFnArgs[0]) !== -1){
            //callback form
            cb = fns.pop();
        }else{
            //promise form
            var resolve;
            var reject;
            result = new Promise(function(rs, rj){
                resolve = rs;
                reject = rj;
            });
            cb = function(err){
                if(err) return reject(err);
                return resolve();
            };
        }
        var funcReturn = func.apply(func, fns.concat([cb]));
        return result || funcReturn;
    }
}

export const createEngine = function(opts){
    var options = opts || {};
    var dependencies = options.dependencies || {};
    var control = {
        with : function(opts){
            var newOptions = {};
            Object.keys(options).forEach(function(key){
                newOptions[key] = options[key];
            });
            var theseOptions = opts || {};
            Object.keys(theseOptions).forEach(function(key){
                newOptions[key] = theseOptions[key];
            });
            return createEngine(newOptions);
        },
        can : unpromisify(function(){
            var args = Array.prototype.slice.call(arguments);
            var desc = (typeof args[0] === 'string')?args[0]:'[In various clients]';
            var cb = args.pop();
            options.framework.test(desc, function(done){
                control.test.apply({}, args.concat([function(err, info){
                    //xform logic here
                    cb(err, info);
                    done();
                }]));
            });
        }),
        cleanup : unpromisify(function(cb){
            var browsers = Object.keys(browserInstances).map((key)=>browserInstances[key]);
            asynk.eachOfLimit(browsers, browsers.length, function(browser, index, done){
                var attempts = 0;
                var maxAttempts = 2;
                var interval = 1000;
                var ensureShutdown = function(cb){
                    if(browser && browser.process() != null){
                        if(attempts > maxAttempts){
                            setTimeout(function(){
                                process.exit();
                            }, 100);
                            throw new Error('Cannot shut browser down');
                        }
                        browser.process().kill('SIGINT');
                        attempts++;
                        setTimeout(function(){
                            ensureShutdown(cb);
                        }, interval);
                    }else cb();
                }
                browser.pages().then(function(pages){
                    asynk.eachOfLimit(pages, pages.length, function(page, i, pageDone){
                        page.close().then(function(){
                            pageDone();
                        });
                    }, function(){
                        browser.close().then(function(){
                            ensureShutdown(done)
                        }).catch(function(ex){
                            console.log('CERR', ex);
                        })
                    })
                }).catch(function(err){
                    cb(err);
                });
            }, function(){
                cb();
            });
        }),
        test : unpromisify(function(){ //always callback form
            var fns = Array.prototype.slice.call(arguments);
            var desc = (typeof fns[0] === 'string')?fns.shift():'[In various clients]';
            var cb = fns.pop();
            var errs  = [];
            /*asynk.eachOfLimit(fns, fns.length, function(fn, index, done){
                const browserInstance = getBrowser(
                    options,
                    options.browsers,
                    index,
                    fn.name
                );
                    function(err, browser, instance){
                        makeDependencies(options.packager, dependencies, function(err, jsCode){
                            if(err) throw err;
                            var subName = desc + '-' + (fn.name || index);
                            var body = {
                                as : function(format){
                                    switch(format){
                                        case 'html':
                                            return options.framework.testHTML(subName, fn, jsCode);
                                        case 'fn':
                                            return fn;
                                        default: throw new Error('unknown format:'+format);
                                    }
                                }
                            };
                            browser.newContext(instance, function(err, context){
                                context.on('console', function(message){
                                    if(message.type().substr(0, 3) === 'log'){
                                        var text = `${message.text()}`;
                                        if(text[0] !== '['){
                                            console.log('[REMOTE LOG] '+text);
                                        }
                                    }
                                });
                                /*context.on('pageerror', ({ message }) =>
                                    console.log(message)
                                );
                                /*context.on('response', response =>
                                    console.log(`${response.status()} ${response.url()}`)
                                );
                                context.on('requestfailed', request =>
                                    console.log(`${request.failure().errorText} ${request.url()}`)
                                );*//*
                                browser.runTests(
                                    context,
                                    body,
                                    [
                                        subName
                                    ], function(err, results){
                                        //todo: configurable err behavior
                                        if(err) errs.push(err);
                                        done();
                                    }
                                );
                            });
                        });
                    }
                );

            }, function(){
                cb(errs[0]);
            });*//*
        })
    }
    return control;
};*/