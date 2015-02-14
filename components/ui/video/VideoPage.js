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
                    template: 'VideoPage.html'
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
        var ThisInstance;

        return {
            __ctor: function() {
                ThisInstance = this;
            },

            /**
             * Prepares the video page controller.
             */
            setupUI: function(UIMgr, app) {
                // create Video controller
                app.lazyController('videoCtrl', function($scope, $interval, keyboardManager) {
                    UIMgr.registerPageScope(ThisInstance, $scope);

                    /**
                     * Scope Data
                     */
                    $scope.videoId = 'M7lc1UVf-VE';  // Default videoId
                    $scope.currentTime = 0;
                    $scope.flags = [];

                    /**
                     * Register interval listener to get video current time periodically
                     */
                    var intervalId;
                    $scope.startGetCurrentTime = function(player) {
                        if (angular.isDefined(intervalId))
                            return;

                        intervalId = $interval(function() {
                            $scope.currentTime = player.getCurrentTime();
                        });
                    };

                    $scope.stopGetCurrentTime = function() {
                        if (angular.isDefined(intervalId)) {
                            $interval.cancel(intervalId);
                            intervalId = undefined;
                        }
                    };

                    /**
                     * Flag handlers
                     */
                    $scope.addFlag = function() {
                        $scope.flags.push($scope.currentTime);
                        $scope.flags = _.unique($scope.flags);
                    };

                    /**
                     * Key press handler
                     */
                    $scope.keyPress = function(event) {
                        $scope.addFlag();
                    };

                    keyboardManager.bind('n', $scope.keyPress, {
                        'inputDisabled': true
                    });


                    /**
                     * Register youtube player events
                     */
                    $scope.$on('youtube.player.ready', function($event, player) {
                        player.playVideo();
                        $scope.startGetCurrentTime(player);
                    });

                    $scope.$on('youtube.player.playing', function($event, player) {

                    });

                    $scope.$on('youtube.player.paused', function($event, player) {

                    });

                    $scope.$on('$destroy', function () {
                       $scope.stopGetCurrentTime();
                    });
                });

                // register page
                Instance.UIMgr.registerPage(this, 'Video', this.assets.template, {
                    cssClasses: 'fa fa-video-camera'
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