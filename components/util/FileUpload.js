/**
 * All utilities required to verify and manage users.
 */
"use strict";

var componentsRoot = '../';
var libRoot = componentsRoot + '../lib/';
var SequelizeUtil = require(libRoot + 'SequelizeUtil');

var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
            /**
             * For each kind of upload request, there exists one UploadConfig instance
             */
            UploadConfig: squishy.createClass(function(options) {
                // ctor
                _.merge(this, options);
            }, {
                // methods

            }),
        
            // setup limits
            DefaultUploadLimits: {
                fieldNameSize: 100,
                files: 1,
                fields: 3,
                fileSize: 1 * 1024 * 1024,      // 1 MB
            },

            getUploadConfig: function(name) {
                return this.uploadConfigs.byName[name];
            },

            Private: {
            }
        };
    }),


    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        // some Node modules for handling file uploads
        var multer,
            path,
            mime,
            fs;

        var publicFolder,
            uploadFolder;

        return {
            __ctor: function () {
                this.uploadConfigs = {
                    list: [],
                    byName: {}
                };
            },
                    
            /**
             * 
             */
            initHost: function(expressApp, cfg) {
                publicFolder = cfg.publicFolder;

                // get some modules we will need for the server
                multer = require('multer');     // multipart file handling
                path = require('path');
                mime = require('mime');
                fs = Promise.promisifyAll(require('fs'));
            },

            UploadConfigHostMembers: {
                deleteFile: function(fileName) {
                    var fpath = this.uploadFolder + fileName;
                    return fs.unlinkAsync(fpath);
                }
            },

            registerUploadHandler: function(options) {
                // set everything up
                var component = options.component;
                console.assert(component, 'Invalid options missing `component`');

                var uploadSubFolder = path.join(Shared.AppConfig.getValue('uploadFolder'), options.name) + '/';

                var componentName = component._def.FullName;

                // this is the URL path that will receive uploads for this configuration
                var uploadPath = '/uploads/' + componentName + '/' + options.name;

                 // this is how ComponentAssets serves files
                var downloadPath = SharedTools.getPublicPath(componentName, uploadSubFolder);
                var uploadFolder = publicFolder + uploadSubFolder;
                console.assert(uploadFolder, 'Missing config entries: `publicFolder` or `uploadFolder`');

                options.uploadPath = uploadPath;
                options.downloadPath = downloadPath;
                options.uploadFolder = uploadFolder;

                // this config will be available on the Client side, too
                var sharedUploadCfg = new this.UploadConfig({
                    name: options.name,
                    uploadPath: uploadPath,
                    downloadPath: downloadPath,
                    uploadFolder: uploadFolder,
                    componentName: componentName,
                });

                // merge in Host-only members, and make sure, they are not sent to Client
                // TODO: Simply use extendClass instead?!?!
                for (var memberName in this.UploadConfigHostMembers) {
                    var member = this.UploadConfigHostMembers[memberName];
                    Object.defineProperty(sharedUploadCfg, memberName, {
                        enumerable: false,
                        value: member.bind(sharedUploadCfg)
                    });
                }

                // add to sets
                this.uploadConfigs.list.push(sharedUploadCfg);
                this.uploadConfigs.byName[options.name] = sharedUploadCfg;

                // add to component
                var componentUploads = component.uploads = (component.uploads || {});
                componentUploads[options.name] = sharedUploadCfg;

                // start listening for client Upload requests
                SharedTools.ExpressRouters.before.post(uploadPath + '*', function (req, res, next) {
                    console.assert(req.Instance, 'Internal error: req.Instance not defined');
                    console.assert(req.runInContext, 'Internal error: req.runInContext not defined');

                    var Instance = req.Instance;

                    // Our best shot at ruling out race conditions
                    req.runInContext(function() {
                        var user = Instance.User.currentUser;
                        if (!Instance.User.isStudent() || !user.gid) {
                            // user must be logged in and part of a group
                            next(new Error('error.invalid.permissions'));
                            return;
                        }

                        // TODO: Only allow uploads with Group-change permission

                        // store files and don't send back response, before promise chain is fulfilled
                        return new Promise(function(resolve, reject) {
                            var promise = Promise.resolve();
                            var rejected = false;

                            var limitHandler = function() {
                                rejected = true;
                                reject('client exceeded limit');
                            };

                            var handler = multer({
                                dest: uploadFolder,
                                limits: options.limits && _.merge(options.limits, this.DefaultUploadLimits) || this.DefaultUploadLimits,

                                rename: options.rename.bind(Instance[componentName]),

                                // enforce limits
                                onFileSizeLimit: limitHandler,
                                onPartsLimit: limitHandler,
                                onFilesLimit: limitHandler,
                                fieldsLimit: limitHandler,

                                onFileUploadStart: options.onFileUploadStart && function() {
                                    var valueOrPromise = options.onFileUploadStart.apply(Instance[componentName], arguments);
                                    promise = promise.then(function() {
                                        return valueOrPromise;
                                    });
                                },

                                onFileUploadComplete: options.onFileUploadComplete && function() {
                                    var valueOrPromise = options.onFileUploadComplete.apply(Instance[componentName], arguments);
                                    promise = promise.then(function() {
                                        return valueOrPromise;
                                    });
                                },

                                onParseEnd: function() {
                                    // upload succeeded!
                                    if (options.onParseEnd instanceof Function) {
                                        promise = promise.then(function() { options.onParseEnd() } );
                                    }

                                    // resolve once all previous promises have been resolved
                                    if (!rejected) {
                                        promise = promise
                                        .then(resolve);
                                    }
                                }
                            });
                            handler(req, res, next);
                        }.bind(this));
                    }.bind(this));
                }.bind(this));
            },

            Private: {
                __ctor: function () {
                    this.events = {
                    };
                },

                getClientCtorArguments: function() {
                    return [this.Shared.uploadConfigs.list];
                },

                onClientBootstrap: function() {
                }
            },

            Public: {
            },
        };
    }),

    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {
            __ctor: function(allUploadOptions) {
                if (!allUploadOptions) return;
                this._allUploadOptions = allUploadOptions;
            },

            initClient: function() {
                var allUploadOptions = this._allUploadOptions;

                this.uploadConfigs = {
                    list: [],
                    byName: {}
                };

                for (var i = 0; i < allUploadOptions.length; ++i) {
                    var uploadOptions = allUploadOptions[i];
                    var config = new this.UploadConfig(uploadOptions);
                    this.uploadConfigs.list.push(config);
                    this.uploadConfigs.byName[config.name] = config;

                    // add client-side members
                    _.merge(config, this.UploadConfigClientMembers);

                    // add to component
                    var component = config.component = Instance[config.componentName];
                    var componentUploads = component.uploads = (component.uploads || {});
                    componentUploads[config.name] = config;
                };
            },

            events: {
            },

            // ################################################################################################
            // Client-side only members of UploadConfig

            UploadConfigClientMembers: {
                /**
                 * @see http://stackoverflow.com/questions/5392344/sending-multipart-formdata-with-jquery-ajax
                 */
                sendFiles: function(files) {
                    var data = new FormData();
                    for (var i = 0; i < files.length; ++i) {
                        var file = files[i];
                        data.append('file' + i, file);
                    };
                    return Tools.sendRequestToHost(this.uploadPath, data);
                },
            },
        };
    })
});