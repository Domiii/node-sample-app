/**
 * 
 */
"use strict";

// ####################################################################################
// Basic libraries

// all kinds of Node modules that we need
var express = require('express');
var domain = require('domain');
var util = require('util');
var path = require('path');
var url = require('url');
var favicon = require('static-favicon');
var fs = require('fs');
var process = require('process');

var httpProxy = require('http-proxy');

// get Promise library from Sequelize to support stacktraces properly
var Sequelize = require('sequelize');

// load config
var appConfig = require('./appConfig');

// load NoGap
var NoGapLoader = require('nogap').Loader;


// ####################################################################################
// shared JS libraries (used on Host and Client), located in the public folder

var publicFolder = appConfig.nogap.publicFolder || './pub';
if (!publicFolder.endsWith('/') && !publicFolder.endsWith('\\')) {
    publicFolder += '/';
}

// Lo-Dash brings all kinds of utilities for array and object manipulation
// see: http://stackoverflow.com/questions/13789618/differences-between-lodash-and-underscore
GLOBAL._ = require(publicFolder + 'lib/lodash.min');

// moment.js for timing and measuring time
GLOBAL.moment = require(publicFolder + 'lib/moment');

// squishy adds some additional tools (e.g. makeEnum, createClass and more)
// squishy adds itself to the global namespace
require(publicFolder + 'js/squishy/squishy');


// ####################################################################################
// setup server

// get setup libraries and start setting up!
var Logging = require('./lib/Logging');
var SequelizeUtil = require('./lib/SequelizeUtil');
var Maintenance = require('./lib/Maintenance');

console.log('Starting server. Please wait...');


// Use an improved `toString` method.
Object.prototype.toString = function() { return squishy.objToString(this, true, 3); };

// fix stacktrace length
// see: http://stackoverflow.com/questions/7697038/more-than-10-lines-in-a-node-js-stack-error
Error.stackTraceLimit = 14;
//Error.stackTraceLimit = Infinity;

// only use one Promise library
GLOBAL.Promise = Sequelize.Promise || require('bluebird');
// setup long stack traces
GLOBAL.Promise.longStackTraces();

// start express app
var app = express();
app.set('title', 'AWESOME APPLICATION');

// add event listener when process exists
Maintenance.events.exit.addListener(function() {
    // close server gracefully
    if (app.serverInstance) {
        app.serverInstance.close();
    }
});

// // add longjohn for long stacktraces
// // see: https://github.com/mattinsler/longjohn
// if (process.env.NODE_ENV !== 'production') {
//     require('longjohn');
// }


// ####################################################################################
// start server

Promise.resolve()
.then(function() {
    // add favicon and session management middleware

    // all these parsers do not play well with POST:
    // see: http://stackoverflow.com/questions/11295554/how-to-disable-express-bodyparser-for-file-uploads-node-js
    //app.use(bodyParser.json());
    //app.use(express.json()).use(express.urlencoded());
    //app.use(bodyParser.urlencoded());

    // add favicon
    app.use(favicon());
        
    // manage sessions & cookies
    var SessionManager = require('./lib/SessionManager');
    var sessionManager = new SessionManager();
    sessionManager.installSessionManager(app);
})
.then(function() {
    // load all of the application's NoGap components
    // Note: This also calls `initHost` on every component
    return NoGapLoader.start(app, appConfig.nogap);
})
.then(function(Shared) {
    // register connection error handler
    Shared.Libs.ComponentCommunications.events.connectionError.addListener(
        Maintenance.reportConnectionError.bind(Maintenance));
    
    // unhandled routes
    app.use(function(req, res, next) {
        var err = new Error('Not Found: ' + req.originalUrl);
        err.status = 404;
        next(err);
    });

    // error handler
    app.use(function(err, req, res, next) {
        var status = err.status || 500;
        console.error('Error during request (' + status + '): ' + (err.stack || err));
        
        res.writeHead(status, {'Content-Type': 'text/html'});
        if (appConfig.dev) {
            res.write('<pre>' + err.stack + '</pre>');
        }
        else {
            res.write('Sorry! Something went wrong :(');
        }
        res.end();
    });
    

    // start configuring DB and setting up tables
    return SequelizeUtil.initModels();
})

/**
 * Start HTTP server.
 */
.then(function startApp() {
    appConfig.httpd.port = appConfig.httpd.port || 8080;

    // use domains to avoid shutdowns
    // see: http://clock.co.uk/blog/preventing-http-raise-hangup-error-on-destroyed-socket-write-from-crashing-your-nodejs-server
    //var serverDomain = domain.create()

    app.serverInstance = app.listen(appConfig.httpd.port, function() {
        console.log('AWESOME APPLICATION is now up and running at port ' + app.serverInstance.address().port);
    }).on('error', function (err) {
        // HTTP listen socket got closed unexpectedly...
        // TODO: Try to re-start instead of closing things down!
        process.exit(new Error('Server connection error: ' + err.stack || err));
    });
})
.catch(function(err) {
    process.exit(new Error('Initialization failed - ' + err.stack));
});


module.exports = app;

