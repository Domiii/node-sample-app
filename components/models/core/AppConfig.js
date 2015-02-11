/**
 * The AppConfig wraps the `appConfig` values into a component.
 * TODO: Enable manipulation of `appConfig` values by storing it all in DB.
 */
"use strict";

var NoGapDef = require('nogap').Def;

var appRoot = '../../../';
var libRoot = appRoot + 'lib/';
var SequelizeUtil = require(libRoot + 'SequelizeUtil');

module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
    	var ConfigModel;
        var UserRole;

        var appConfigJs;

        return {
            __ctor: function () {
                appConfigJs = require(appRoot + 'appConfig');
            },

            initHost: function(app, cfg) {
                UserRole = Shared.User.UserRole;

                /**
                 * Min privilege level required to use the system.
                 */
                appConfigJs.minAccessRole = Shared.User.UserRole.Student;
                this.defaultConfig = appConfigJs;

            },

            /**
             * Get default config value.
             */
            getValue: function(key) {
                return this.defaultConfig[key];
            },


            // ################################################################################################################
            // Config instance

            Private: {
                __ctor: function () {
                },

                onNewClient: function() {
                },

                onClientBootstrap: function() {
                    this.client.setConfig(this.Shared.defaultConfig);
                }
            },

            Public: {
            },
        };
    }),

    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {
            __ctor: function () {
            },

        	// setValue: function(name, value) {
        	// 	this.cfg[name] = value;
        	// 	// TODO: Store value in DB
        	// 	//this.host.setValue(name, value);
        	// },

        	getValue: function(name) {
        		return this.cfg[name];
        	},

            Public: {
            	setConfig: function(cfg) {
            		this.cfg = cfg;
            	},
            }
        };
    })
});