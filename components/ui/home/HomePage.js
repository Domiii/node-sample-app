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
                    template: 'HomePage.html'
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

        Private: {
            getClientCtorArguments: function() {
                return [];
            }
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
        var ThisComponent;

        return {
            __ctor: function(_brightness) {
                ThisComponent = this;
            },

            /**
             * Prepares the home page controller.
             */
            setupUI: function(UIMgr, app) {
                // create Home controller
                app.lazyController('homeCtrl', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    
                    $scope.clickLogout = function() {
                        $scope.busy = true;
                        
                        return ThisComponent.Instance.User.logout()
                        .finally(function() {
                            $scope.busy = false;
                        })
                        .catch($scope.handleError.bind($scope));
                    };

                    $scope.getLEDColorYellow = function() {
                        var b = Instance.Arduino.getLEDBrightness();
                        return '#' + b.toString(16) + b.toString(16) + '00';
                    };

                    $scope.Arduino = Instance.Arduino;
                });

                // register page
                Instance.UIMgr.registerPage(this, 'Home', this.assets.template, {
                    iconClasses: 'fa fa-home'
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