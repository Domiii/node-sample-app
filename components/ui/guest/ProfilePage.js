/**
 * This component takes care of rendering things for users who are not logged in.
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
            DefaultRole: Shared.User.UserRole.Student,

            validateStudentId: function(studentId) {
                if(!studentId) return false;

                studentId = Shared.ValidationUtil.trimNameOrTitle(studentId);

                //check length
                if(studentId.length < 0) return false;
                else return studentId;
            },

            validateEmail: function(email) {
                if(!email) return false;

                email = Shared.ValidationUtil.trimNameOrTitle(email);

                return email.indexOf('@') >= 0 ? email : false;
            },
        };
    }),

    /**
     * Everything defined in `Host` lives only on the host side (Node).
     * 
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
 
        return {
            Assets: {
                Files: {
                    string: {
                        template: 'ProfilePage.html'
                    }
                },
                AutoIncludes: {
                }
            },

            __ctor: function() {
 
            },
               

            Private: {
                onClientBootstrap: function() {
                },
            },

            Public: {

                /**
                 * User clicked on `Login` button.
                 */

                updateProfile: function(profileData) {
                    var isProfileLocked = Shared.AppConfig.getValue('profileLocked');
                    if (isProfileLocked && !this.Instance.User.isStaff()) {
                        return Promise.reject(makeError('error.invalid.request'));
                    }

                    var user = this.Instance.User.currentUser;

                    var studentId = this.Shared.validateStudentId(profileData.studentId);
                    var email     = this.Shared.validateEmail(profileData.email);
                    var name      = Shared.ValidationUtil.validateNameOrTitle(profileData.name);
                    var realName  = Shared.ValidationUtil.validateNameOrTitle(profileData.realName);

                    if (!studentId || !name || !realName || !email) {
                        // tell client that login failed
                        return Promise.reject('error.login.auth');
                    }

                    var newUserData = {
                        name: name,
                        realName: realName,
                        studentId: studentId,
                        email: email
                    };

                    var isRegistering = user.role < this.Shared.DefaultRole;
                    if (isRegistering) {
                        newUserData.role = this.Shared.DefaultRole;
                        newUserData.displayRole = this.Shared.DefaultRole;
                    }

                    return this.Instance.User.updateProfile(user, newUserData, isRegistering);
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
        var scope;
        var ThisComponent;

        return {
            initClient: function() {
                // get some default utilities
                ThisComponent = this;
                localizer = Instance.Localizer.Default;
            },

            /**
             * Called by `UIMgr`
             */
            setupUI: function(UIMgr, app) {
                // create login controller
                // see: http://stackoverflow.com/questions/22589324/angular-js-basic-controller-return-error
                // see: http://scotch.io/tutorials/javascript/submitting-ajax-forms-the-angularjs-way
                app.lazyController('profileCtrl', ['$scope', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    scope = $scope;

                    // data to populate the login form
                    var user = Instance.User.currentUser;

                    $scope.userData = {
                        name: user.name,
                        realName: user.realName,
                        studentId: user.studentId,
                        email: user.email
                    };

                    $scope.isProfileLocked = Instance.AppConfig.getValue('profileLocked');
                    $scope.isRegistrationLocked = Instance.User.isRegistrationLocked(user);
                    $scope.isRegistration = Instance.User.currentUser.role < this.DefaultRole;

                    //$scope.isLocked = ($scope.isRegistration && $scope.isRegistrationLocked) ||
                        // (!$scope.isRegistration && $scope.isProfileLocked);
                    $scope.isLocked = !$scope.currentUserIsStaff && !$scope.isRegistration && $scope.isProfileLocked;

                    $scope.busy = false;
                    $scope.errorMessage = null;
                   
                    // the function to be called when `register` is clicked
                    $scope.clickUpdate = function() {
                        if ($scope.nameInvalid) return;

                        // send login request to host
                        $scope.errorMessage = null;
                        $scope.busy = true;

                        ThisComponent.host.updateProfile($scope.userData)
                        .finally(function() {
                            $scope.busy = false;
                        })
                        .then(function() {
                            // success!
                            $scope.$apply();
                            return Instance.UIMgr.gotoPage('Account', { infoMessage: 'Profile updated.' });
                        })
                        .catch($scope.handleError.bind($scope));
                    };

                    // function for validation
                    $scope.validateStudentId = ThisComponent.validateStudentId;
                    $scope.validateEmail = ThisComponent.validateEmail;

                    $scope.addNewUserToFacebookGroupViaDialog = function() {
                        FB.ui({
                          method: 'game_group_join',
                          id: '1542457789356843',
                          display: 'popup'
                        }, function(response) {
                            if (response.added == true) {
                            } else {
                                alert("error: " + response.error_message);
                            }
                            $scope.inFBGroup = true;
                            $scope.$apply();
                        });                     
                    };

                }]);

                // register page
                Instance.UIMgr.registerPage(this, 'Profile', this.assets.template);
            },
            
            
            /**
             * Client commands can be directly called by the host with this = owning LoginComponent.client instance.
             */
            Public: {
                onLoginSuccess: function() {
                    scope.safeDigest();
                }
            }
        };
    })
});