/**
 * 
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    Namespace: 'bjt',

    /**
     * Include these components with this component.
     */
    Includes: [
        //下面兩行被我註解掉  要弄回來
        //'ScheduleListElement',
        //'ActivityListElement'
    ],

    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
            /**
             * Treat these components as children of SettingsPage.
             */
            PageChildren: [
            //下面兩行被我註解掉  要弄回來
            //    'ScheduleListElement',
            //    'ActivityListElement'
            ]
        };
    }),

    // #################################################################################
    // Host

    /**
     * Everything defined in `Host` lives only on the host side (server).
     * 
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        return {
            Assets: {
                Files: {
                    string: {
                        template: 'AdminPage.html',
                        modalTemplate: 'CreateActivity.html',
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
                onNewClient: function() {
                },   
            },
            
            /**
             * Host commands can be directly called by the client
             */
            Public: {
            },
        };
    }),
    

    // #################################################################################
    // Client
    
    /**
     * Everything defined in `Client` lives only in the client.
     *
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var scope,              // Global scope
            userScope;

        var UsersView;

        var invalidateView = function() {
            if (scope && !scope.$$phase) scope.$digest();
        };

        var UserRole;

        var ThisComponent;
        return {
            __ctor: function() {
                ThisComponent = this;
                UsersView = {
                    loading: true,
                    users: Instance.User.users
                };
            },

            // ################################################################################################
            // Setup

            initClient: function() {
                UserRole = Instance.User.UserRole;
            },

            /**
             *
             */
            setupUI: function(UIMgr, app) {
                var This = this;
                
                // create Settings controller
                app.lazyController('adminCtrl', ['$scope','$modal', function($scope,$modal) {
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    scope = $scope;
                    scope.userRoleToString = function(userRole) {
                        return Instance.User.UserRole.getName(userRole);
                    };

                    $scope.createActivity = function(article) {
                        $scope.activityRenderModal('lg', function() {
                            // user pressed Ok -> Do delete article!
                            $scope.delete(article); 
                        });
                    };

                    $scope.activityRenderModal = function (size, onOk, onDismiss) {
                        var modalInstance = $modal.open({
                            template: ThisComponent.assets.modalTemplate ,
                            size: size,
                            resolve: {
                                items: function () {
                                }
                            },
                            controller: function ($scope, $modalInstance, items) {
                                $scope.ok = function () {
                                    $modalInstance.close('ok');
                                };

                                $scope.cancel = function () {
                                    $modalInstance.dismiss('cancel');
                                };
                            }
                        });

                        modalInstance.result.then(onOk, onDismiss);
                    };


                }]);

                // register page
                Instance.UIMgr.registerPage(this, 'Admin', this.assets.template);
            },

            onPageActivate: function() {

            },


            
            /**
             * Client commands can be directly called by the host
             */
            Public: {
                // ################################################################################################
                // Public methods for server replies
            }
        };
    })
});