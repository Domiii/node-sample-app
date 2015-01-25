/**
 * This component takes care of rendering things for users who are not logged in.
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * Everything defined in `Host` lives only on the host side (Node).
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { return {
        Assets: {
            Files: {
                string: {
                    template: 'GuestPage.html'
                }
            },
            AutoIncludes: {
            }
        },
           

        Private: {
            onClientBootstrap: function() {
            },
        },

        Public: {

            /**
             * User clicked on `Login` button.
             */
            tryLogin: function(userName, preferredLocale) {
                userName = Shared.ValidationUtil.validateNameOrTitle(userName);
                if (!userName) {
                    // tell client that login failed
                    return Promise.reject('error.login.auth');
                }

                var authData = {userName: userName};
                return this.Instance.User.tryLogin(authData, preferredLocale);
            }
        },
    };}),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var localizer;
        var scope;

        return {
            initClient: function() {
                // get some default utilities
                localizer = Instance.Localizer.Default;
            },

            /**
             * Called by `UIMgr`
             */
            setupUI: function(UIMgr, app) {
                var This = this;

                // create login controller
                // see: http://stackoverflow.com/questions/22589324/angular-js-basic-controller-return-error
                // see: http://scotch.io/tutorials/javascript/submitting-ajax-forms-the-angularjs-way
                app.lazyController('guestCtrl', ['$scope', function($scope) {
                    AngularUtil.decorateScope($scope);
                    scope = $scope;

                    // data to populate the login form
                    $scope.loginData = {
                        userName: ''
                    };

                    $scope.busy = false;
                    $scope.errorMessage = null;
                   
                    // the function to be called when `login` is clicked
                    $scope.clickLogin = function() {
                        if ($scope.nameInvalid) return;

                        // send login request to host
                        $scope.errorMessage = null;
                        $scope.busy = true;
                        This.host.tryLogin($scope.loginData.userName, Instance.User.getCurrentLocale())
                        .finally(function() {
                            $scope.busy = false;
                        })
                        .then(function() {
                            // success!
                            $scope.$apply();
                        })
                        .catch($scope.handleError.bind($scope));
                    };

                    // auto login as 'SomeUser'
                    // setTimeout(function() {
                    //     $scope.loginData.userName = 'SomeUser';
                    //     $scope.nameInvalid = false;
                    //     $scope.clickLogin();
                    // }, 500);
                }]);

                // register page
                Instance.UIMgr.registerPage(this, 'Guest', this.assets.template);
            },
            
            
            /**
             * Client commands can be directly called by the host with this = owning LoginComponent.client instance.
             */
            Public: {
                onLoginSuccess: function() {
                    scope.safeApply();
                }
            }
        };
    })
});