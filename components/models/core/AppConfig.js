/**
 * The AppConfig defines, and allows manipulation and sharing of global application settings.
 */
"use strict";

var NoGapDef = require('nogap').Def;

var componentsRoot = '../../';
var libRoot = componentsRoot + '../lib/';
var SequelizeUtil = require(libRoot + 'SequelizeUtil');

module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
    	var ConfigModel;
        var UserRole,
            ActionType;

        return {
            __ctor: function () {
            },

            initHost: function() {
                UserRole = Shared.User.UserRole;

                this.defaultConfig = {
                    'defaultLocale': 'en',

                    /**
                     * Min privilege level required to use the system.
                     */
                    'minAccessRole': Shared.User.UserRole.Student,

                    /**
                     * If # ratings is below this number, do not display the rating results yet.
                     */
                    'minItemRatingsToDisplay': 1,
                };
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