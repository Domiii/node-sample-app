/**
 * TODO: 1.Wrap the player with a Angular directive and flag with plugin directive (modularize)
 * TODO: 2.improve watch to wait for user typing in url
 * TODO: 3.z-index test (a.youtube iframe blocker, b.control bar disappear on change source)
 * TODO: 4.register onComplete event and onPause event (to show big play button)
 * TODO: 5.make the video player responsive
 * TODO: 6.test on other browsers
 * TODO: 7.Enhance error source url handling (when source url is not valid)
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
                app.lazyController('videoCtrl', function($scope, $element, $interval, keyboardManager) {
                    UIMgr.registerPageScope(ThisInstance, $scope);

                    var createVideoElement = function() {
                        var videoElement = angular.element('<video id="player" src="" class="video-js vjs-default-skin vjs-big-play-centered" controls preload="auto" width="640" height="360"></video>');
                        $element.prepend(videoElement);
                    };

                    // Different kinds of media types
                    var mediaTypes = {
                        "YOUTUBE": "video/youtube",
                        "MP4"    : "video/mp4",
                        "WEBM"   : "video/webm",
                        "OGG"    : "video/ogg",

                        "UNKNOWN": "unknown"
                    };

                    var getTechOrderFromMediaType = function(mediaType) {
                        switch (mediaType) {
                            case mediaTypes['YOUTUBE']:
                                return ["youtube"];
                            case mediaTypes['MP4']:
                            case mediaTypes['WEBM']:
                            case mediaTypes['OGG']:
                            case mediaTypes['UNKNOWN']:
                                return ["html5", "flash"];
                        }
                    };

                    /**
                     * Key binding setup functions
                     */
                    var keyConfig = Instance.AppConfig.getValue('videoPlayer').keyBindings;
                    var addKeyBindings = function() {
                        keyboardManager.bind(keyConfig.setFlag, $scope.addFlag, {
                            'inputDisabled': true
                        });
                        keyboardManager.bind(keyConfig.playPause, function() {  // Press space button to play & pause video
                            if ($scope.player) {
                                if ($scope.player.paused()) {
                                    $scope.player.play();
                                } else {
                                    $scope.player.pause();
                                }
                            }
                        }, {
                            'inputDisabled': true
                        });
                    };

                    var removeKeyBindings = function() {
                        keyboardManager.unbind(keyConfig.setFlag);
                        keyboardManager.unbind(keyConfig.playPause);
                    };

                    var parseSourceUrl = function(url) {
                        // Regex to parse the video ID
                        var youtubeRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                        var mp4RegExp = /^.*(\.mp4)$/;
                        var webmRegExp = /^.*(\.webm)$/;
                        var oggRegExp = /^.*(\.ogg)$/;

                        if (typeof url == 'string') {
                            if (url.match(youtubeRegExp)) {
                                return mediaTypes['YOUTUBE'];
                            } else if (url.match(mp4RegExp)) {
                                return mediaTypes['MP4'];
                            } else if (url.match(webmRegExp)) {
                                return mediaTypes['WEBM'];
                            } else if (url.match(oggRegExp)) {
                                return mediaTypes['OGG'];
                            }
                        }
                        return mediaTypes['UNKNOWN'];
                    };

                    /**
                     * Register interval listener to get video current time periodically
                     */
                    var intervalId;
                    var startGetCurrentTime = function() {
                        if (angular.isDefined(intervalId))
                            return;

                        intervalId = $interval(function() {
                            $scope.currentTime = $scope.player.currentTime();
                        }, 600);
                    };

                    var stopGetCurrentTime = function() {
                        if (angular.isDefined(intervalId)) {
                            $interval.cancel(intervalId);
                            intervalId = undefined;
                        }
                    };

                    /**
                     * Player event handlers
                     */
                    var onReady = function() {
                        addKeyBindings();
                        startGetCurrentTime();
                    };

                    var onDispose = function() {
                        removeKeyBindings();
                        stopGetCurrentTime();
                    };

                    /**
                     * Scope Data
                     */
                    $scope.sourceUrl = "http://www.youtube.com/watch?v=M7lc1UVf-VE";  // Default Source Url
                    $scope.mediaType = mediaTypes['YOUTUBE'];
                    //$scope.sourceUrl = "http://video-js.zencoder.com/oceans-clip.mp4";  // Default Source Url
                    //$scope.mediaType = mediaTypes['MP4'];

                    $scope.player = videojs('player', { "techOrder": getTechOrderFromMediaType($scope.mediaType) });
                    $scope.player.src({ "src": $scope.sourceUrl, "type": $scope.mediaType });

                    $scope.currentTime = 0;
                    $scope.flags = [];

                    /**
                     * Scope Functions
                     */
                    $scope.$watch("sourceUrl", function(newValue, oldValue) {
                        if (newValue !== oldValue) {
                            var parsedMediaType = parseSourceUrl($scope.sourceUrl);
                            if (parsedMediaType !== "unknown") {
                                $scope.mediaType = parsedMediaType;
                            } else {
                                $scope.sourceUrl = oldValue;
                            }
                            if ($scope.player) {
                                $scope.player.dispose();
                                onDispose();
                                createVideoElement();
                                $scope.player = videojs('player', { "techOrder": getTechOrderFromMediaType($scope.mediaType) });
                                $scope.player.src({ "src": $scope.sourceUrl, "type": $scope.mediaType });
                                $scope.player.ready(onReady);
                            }
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


                    $scope.player.ready(onReady);

                    $scope.$on('$destroy', function () {
                        $scope.player.dispose();
                        $scope.player = null;
                        onDispose();
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