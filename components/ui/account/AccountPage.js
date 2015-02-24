/**
 * 
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * Everything defined in `Host` lives only on the host side (here).
     * 
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        return {
            Assets: {
                Files: {
                    string: {
                        template: 'AccountPage.html'
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
                onClientBootstrap: function() {
                },   
            },
            
            /**
             * Host commands can be directly called by the client
             */
            Public: {
                setDisplayRole: function(newRole) {
                    var user = this.Instance.User.currentUser;
                    var UserRole = Shared.User.UserRole;

                    // only staff members may set their display role
                    if (!user || user.role <= UserRole.Student) {
                        return Promise.reject('error.invalid.request');
                    }
                    // one can never increase one's own role
                    else if (newRole > user.role) {
                        return Promise.reject('error.invalid.permissions');
                    }
                    else {
                        // update user values
                        return this.Instance.User.updateCurrentUserValues({displayRole: newRole});
                    }
                },

                setLocale: function(newLocale) {
                    var user = this.Instance.User.currentUser;

                    if (!user) {
                        return Promise.reject('error.invalid.request');
                    }
                    else {
                        // update user values
                        return this.Instance.User.updateCurrentUserValues({locale: newLocale});
                    }
                }
            },
        };
    }),
    
    
    /**
     * Everything defined in `Client` lives only in the client.
     *
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;

        return {
            __ctor: function() {
                ThisComponent = this;
            },

            /**
             * 
             */
            setupUI: function(UIMgr, app) {
                this.allLocales = Instance.Localizer.Default.getAllLocales();
                
                // create Account controller
                app.lazyController('accountCtrl', function($scope) {
                	UIMgr.registerPageScope(ThisComponent, $scope);

                    $scope.userRole = Instance.User.currentUser.role;
                    $scope.userRoleString = Instance.User.UserRole.toString($scope.userRole);

                    $scope.clickLogout = function() {
                        $scope.busy = true;
                        
                        return ThisComponent.Instance.User.logout()
                        .finally(function() {
                            $scope.busy = false;
                        })
                        .catch($scope.handleError.bind($scope));
                    };

                    /**
                     * Change display role for staff to see the website
                     * from a student's point of view.
                     */
                    var changeDisplayRole = function(newRole) {
                        $scope.busyRole = true;
                        ThisComponent.host.setDisplayRole(newRole)
                        .finally(function() {
                            $scope.busyRole = false;
                        })
                        .then(function() {
                            // blank the whole thing and reload
                            document.body.innerHTML = '';
                            location.reload();
                        })
                        .catch($scope.handleError.bind($scope));
                    };

                    // set student display role
                    $scope.clickStudentDisplayRole = function() {
                        var newRole = Instance.User.UserRole.Student;
                        changeDisplayRole(newRole);
                    };

                    // change back to default role
                    $scope.clickDefaultDisplayRole = function() {
                        var newRole = Instance.User.currentUser.role;
                        changeDisplayRole(newRole);
                    };

                    $scope.setLocale = function(newLocale) {
                        $scope.busyLocale = true;
                        ThisComponent.host.setLocale(newLocale)
                        .finally(function() {
                            $scope.busyLocale = false;
                        })
                        .then(function() {
                            $scope.$apply();
                        })
                        .catch($scope.handleError.bind($scope));
                    };

                    /**
                     * Check if role was changed and update menu correspondingly.
                     */
                    $scope.updateRoleStatus = function(newRole) {
                        var roleChanged = Instance.User.currentUser.role != newRole;
                        $scope.roleChanged = roleChanged;

                        // sync button mark?
                        ThisComponent.page.navButton && ThisComponent.page.navButton.setUrgentMarker(roleChanged);
                    };

                    
                    $scope.updateRoleStatus(Instance.User.currentUser.displayRole);
                });

                // register page
                Instance.UIMgr.registerPage(this, 'Account', this.assets.template, {
                    iconClasses: 'fa fa-user',
                    right: 2,
                    getText: function() {
                        var user = Instance.User.currentUser;
                        return user && user.name;
                    }
                });
            },

            onPageActivate: function() {
            },
            
            /**
             * Public component methods can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});
