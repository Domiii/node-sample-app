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

        }
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
                    // Different kinds of media types
                    $scope.mediaTypes = {
                        "YOUTUBE": "video/youtube",
                        "MP4"    : "video/mp4",
                        "WEBM"   : "video/webm",
                        "OGG"    : "video/ogg",

                        "UNKNOWN": "unknown"
                    };

                    $scope.sourceUrl = "http://www.youtube.com/watch?v=M7lc1UVf-VE";  // Default Source Url
                    $scope.mediaType = $scope.mediaTypes['YOUTUBE'];

                    var parseSourceUrl = function(url) {
                        // Regex to parse the video ID
                        var youtubeRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                        var mp4RegExp = /^.*(\.mp4)$/;
                        var webmRegExp = /^.*(\.webm)$/;
                        var oggRegExp = /^.*(\.ogg)$/;

                        if (url.match(youtubeRegExp)) {
                            return $scope.mediaTypes['YOUTUBE'];
                        } else if (url.match(mp4RegExp)) {
                            return $scope.mediaTypes['MP4'];
                        } else if (url.match(webmRegExp)) {
                            return $scope.mediaTypes['WEBM'];
                        } else if (url.match(oggRegExp)) {
                            return $scope.mediaTypes['OGG'];
                        } else {
                            return $scope.mediaTypes['UNKNOWN'];
                        }
                    };

                    $scope.player = videojs('player', { "techOrder": ["youtube", "html5"], "src": $scope.sourceUrl });
                    $scope.currentTime = 0;
                    $scope.flags = [];

                    $scope.$watch("sourceUrl", function(oldValue, newValue) {
                        if (newValue !== oldValue) {
                            var parsedMediaType = parseSourceUrl($scope.sourceUrl);
                            $scope.mediaType = parsedMediaType !== "unknown" ? parsedMediaType : $scope.mediaType;
                            $scope.player.src({ "src": $scope.sourceUrl, "type": $scope.mediaType });
                            $scope.flags = [];
                        }
                    });

                    /**
                    * Flag handlers
                    */
                    $scope.addFlag = function() {
                        $scope.flags.push($scope.currentTime);
                        $scope.flags = _.unique($scope.flags);
                    };

                    $scope.removeFlag = function(value) {
                        $scope.flags = _.without($scope.flags, value);
                    };

                    /**
                    * Key press handlers
                    */
                    $scope.keyPress = function(event) {
                        $scope.addFlag();
                    };

                    keyboardManager.bind('n', $scope.addFlag, {
                        'inputDisabled': true
                    });

                    $scope.onReady = function() {
                        $scope.startGetCurrentTime();
                        keyboardManager.bind('space', function() {  // Press space button to play & pause video
                            if ($scope.player.paused()) {
                                $scope.player.play();
                            } else {
                                $scope.player.pause();
                            }
                        }, {
                            'inputDisabled': true
                        });
                    };

                    $scope.player.ready($scope.onReady);

                    /**
                    * Register interval listener to get video current time periodically
                    */
                    var intervalId;
                    $scope.startGetCurrentTime = function() {
                        if (angular.isDefined(intervalId))
                            return;

                        intervalId = $interval(function() {
                            $scope.currentTime = $scope.player.currentTime();
                        }, 600);
                    };

                    $scope.stopGetCurrentTime = function() {
                        if (angular.isDefined(intervalId)) {
                            $interval.cancel(intervalId);
                            intervalId = undefined;
                        }
                    };

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