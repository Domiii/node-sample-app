/**
 * group-score directive
 */
"use strict";


var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    Namespace: 'bjt',

    /**
     * Base is available in both, host and client.
     */
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) { 
        return {
        };
    }),

    /**
     * Everything defined in `Host` lives only on the host side (here).
     * 
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        return {
            Assets: {
                Files: {
                    string: {
                        template: 'GroupScoreElement.html',
                    }
                },
                AutoIncludes: {
                }
            },

            __ctor: function() {
            },

            Private: {
            },
        }
    }),

    Client: NoGapDef.defClient(function(Tools, Instance, Context) { 
        var allScopes = [];
        return {
            /**
             * 
             */
            setupUI: function(UIMgr, app) {
                var linkFun = function($scope, $element, $attrs) {
                    // ##################################
                    // some mandatory setup:

                    AngularUtil.decorateScope($scope);

                    allScopes.push($scope);     // add to set of all ratings scope
                    $scope.$on('$destroy', function() {
                        // scope was destroyed -> Remove from set
                        _.remove(allScopes, $scope);
                    });
                };

                // create group-score directive
                app.lazyDirective('groupScore', function() { 
                    return {
                        restrict: 'E',                  // Element
                        transclude: false,
                        link: linkFun,
                        template: this.assets.template
                    };
                }.bind(this) );
            },
        };
    })
});