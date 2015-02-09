/**
 * 
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * Everything defined in `Host` lives only on the host side (Node).
     */
    Host: NoGapDef.defHost(function(Shared, Context) { return {
        Assets: {
            Files: {
                string: {
                    template: 'ContactPage.html'
                }
            },
            AutoIncludes: {
            }
        },
                
        /**
         * 
         */
        initHost: function() {
            
        },
        
        /**
         * Host commands can be directly called by the client
         */
        Public: {
            
        },
    }}),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) { 
        return {
            /**
             * Prepares the home page controller.
             */
            setupUI: function(UIMgr, app) {
                var This = this;
                
                // create Home controller
                app.lazyController('contactCtrl', ['$scope', function($scope) {
                    
                }]);

                // register page envelope-o
                Instance.UIMgr.registerPage(this, 'Contact', this.assets.template, {
                    cssClasses: 'fa fa-envelope-o'
                });
            },
            
            /**
             * Client commands can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});