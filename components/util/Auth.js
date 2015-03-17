/**
 * Utility component for logging of high-level system and user events.
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * The `Base` definition is merged into both, `Host` and `Client`
     */
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        var readLang;

        return {
            /**
             * Called right before `__ctor` of `Host` and `Client`.
             * Will be removed once called.
             */
            __ctor: function() {
            },

            /**
             * Called right before `initHost` and `initClient`.
             */
            initBase: function() {
            },

            Private: {
 
            }
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {

        var passport,
            FacebookStrategy,
            authRouter,
            express,
            session;

        return {
            /**
             * The ctor is called only once, during NoGap initialization,
             * when the shared component part is created.
             * Will be removed once called.
             */
            __ctor: function () {
            },

            /**
             * Is called once on each component after all components have been created.
             */
            initHost: function(app, cfg) {
                var authPath = '/Auth';

                express = require('express');
                passport = require('passport');
                FacebookStrategy = require('passport-facebook').Strategy;
                authRouter = express.Router();

                passport.serializeUser(function(user, done) {
                    done(null, user && user.uid || user);
                });

                // used to deserialize the user
                passport.deserializeUser(function(id, done) {
                    done(null, id);
                    // User.find(id).complete(function(err, user) {
                    //     done(err, user);
                    // });
                });

                
                var facebookCallbackUrl = 'http://' + app.serverListenAddress + authPath + '/facebook/callback';

                passport.use(new FacebookStrategy({
                    clientID: Shared.AppConfig.getValue('facebookAppID'),
                    clientSecret: Shared.AppConfig.getValue('facebookAppSecret'), 
                    callbackURL: facebookCallbackUrl,
                    passReqToCallback : true
                },

                function(req, accessToken, refreshToken, profile, done) {
                    var Instance = req.Instance;
                    if (!Instance) {
                        res.redirect(301, '/');
                        return;
                    }

                    process.nextTick(function() {
                        var authData = {
                            facebookID: profile.id,

                            facebookToken: accessToken,
                            userName: profile.name.givenName + ' ' + profile.name.familyName,
                            preferredLocale: profile._json && profile._json.locale && profile._json.locale.replace('_', '-')
                        };

                        Instance.User.tryLogin(authData)
                        .then(function(user) {
                            done(null, user);
                        })
                        .catch(function(err) {
                            done(err, null);
                        });
                    });
                })); 


                authRouter.use(function(req, res, next) {
                    //console.error(req.url);
                    next();
                });
                authRouter.get('/facebook', passport.authenticate('facebook', {scope: 'email'}));
                authRouter.get('/facebook/callback', 
                    passport.authenticate('facebook', {
                        successRedirect: '/Home',
                        failureRedirect: '/'
                }));                
 
                SharedTools.ExpressRouters.before.use(passport.initialize());
                //SharedTools.ExpressRouters.before.use(passport.session());
                SharedTools.ExpressRouters.before.use(authPath, authRouter);
                    // function(req, res) {
                    //     res.writeHead(200, {'Content-Type': 'text/html'});
                    //     res.write('HELLO AUTH');s
                    //     res.end();
                    // });        


/*

    authRouter.use(

    .session()); // persistent login sessions
    authRouter.use(flash()); // use connect-flash for flash messages stored in session
 */   

    // routes ======================================================================
    //require('./auth/routes.js')(authRouter, passport); // load our routes and pass in our app and fully configured passport                

            },

            /**
             * Private instance members.
             */
            Private: {
                __ctor: function() {

                }
            },

            /**
             * Public instance methods that can be called by the client.
             */
            Public: {
            },
        };
    }),

    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {
            /**
             * Called once after creation of the client-side instance.
             * Will be removed once called.
             */
            __ctor: function () {
            },

            /**
             * Called once after all currently deployed client-side 
             * components have been created.
             * Will be removed once called.
             */
            initClient: function() {

            },

            /**
             * This is optional and will be merged into the Client instance,
             * residing along-side the members defined above.
             */
            Private: {
            },

            /**
             * Public instance methods that can be called by the host.
             */
            Public: {

            }
        };
    })
});