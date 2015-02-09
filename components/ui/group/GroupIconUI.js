/**
 * group-icon directive
 */
"use strict";


var NoGapDef = require('nogap').Def;



module.exports = NoGapDef.component({
    Namespace: 'bjt',

    Base: NoGapDef.defBase(function() {
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
                        template: 'GroupIconUI.html'
                    }
                },
                AutoIncludes: {
                }
            },
        };
    }),
    
    
    /**
     * Everything defined in `Client` lives only in the client.
     *
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var localizer;
        var ThisComponent;

        var allIconScopes = [];

        return {
            __ctor: function() {
                ThisComponent = this;
            },

            setupUI: function(UIMgr, app) {
                // group-icon directive
                app.lazyDirective('groupIcon', function() {
                    var sizes = {
                        xl: 256,
                        large: 128,
                        medium: 64,
                        small: 32,
                        tiny: 16,
                    };

                    var sizeStrings = {};
                    for (var sizeName in sizes) {
                        sizeStrings[sizeName] = sizes[sizeName] + 'px';
                    }

                    var linkFun = function($scope, $element, $attrs) {
                        AngularUtil.decorateScope($scope);
                        allIconScopes.push($scope);

                        $scope.onGroupDataChanged = function(newGid) {
                        }.bind($scope);

                        $scope.allGroups = Instance.Group.groups;
                        $scope.FileUpload = Instance.FileUpload;
                        $scope.getGroupIconSrc = function() {
                            var gid = $scope.gid;
                            var group = gid && $scope.allGroups.map[gid];
                            return group && group.getGroupIconSrc();
                        };

                        $scope.size = $attrs.size;

                        //$scope.size = $scope.size || 'large';
                        $scope.sizes = sizes;
                        $scope.sizeStrings = sizeStrings;
                        $scope.$watch('gid', $scope.onGroupDataChanged);
                    };

                    return {
                        restrict: 'E',
                        link: linkFun,
                        replace: true,
                        template: ThisComponent.assets.template,
                        scope: {
                            gid: '=',
                            showName: '='
                        }
                    };
                });
            },

            cacheEventHandlers: {
                groups: {
                    updated: function(newValues) {
                        for (var i = 0; i < allIconScopes.length; ++i) {
                            var scope = allIconScopes[i];
                            scope.$digest();
                        };
                    }
                },
            }
        };
    })
});