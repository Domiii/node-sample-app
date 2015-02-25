/**
 * TODO: 1.Wrap the player with an Angular directive and flag with plugin directive (modularize)
 * TODO: 2.Improve watch to wait for user typing in url
 * TODO: 3.onReady problem
 * TODO: 4.Ensure all buttons get the player parameters (e.g. duration) only when the player is ready
 * TODO: 5.Enhance error source url handling (when source url is not valid)
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

                    var mediaTypes = {
                        YOUTUBE: { type: "video/youtube", techOrder: ["youtube"] },
                        MP4    : { type: "video/mp4", techOrder: ["html5", "flash"] },
                        WEBM   : { type: "video/webm", techOrder: ["html5", "flash"] },
                        OGG    : { type: "video/ogg", techOrder: ["html5", "flash"] },

                        UNKNOWN: "unknown"
                    };

                    var tag = function(startTime, endTime, label) {
                        this.range = [startTime, endTime];
                        this.label = label;
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
                            if (url.match(mp4RegExp)) {
                                return mediaTypes['MP4'];
                            } else if (url.match(webmRegExp)) {
                                return mediaTypes['WEBM'];
                            } else if (url.match(oggRegExp)) {
                                return mediaTypes['OGG'];
                            } else if (url.match(youtubeRegExp)) {
                                return mediaTypes['YOUTUBE'];
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
                     * Video player setup
                     */
                    var createVideoElement = function() {
                        var videoElement = angular.element(
                            '<video id="player" class="video-js vjs-default-skin vjs-big-play-centered" controls preload="auto" width="auto" height="auto">' +
                                '<source/>' +
                            '</video>');
                        $element.children('.video-content').prepend(videoElement);
                    };

                    var createPlayer = function(sourceUrl) {
                        createVideoElement();
                        $scope.mediaType = parseSourceUrl(sourceUrl);
                        var sourceElement = $element.find('source');
                        sourceElement.attr('src', sourceUrl);
                        sourceElement.attr('type', $scope.mediaType.type);
                        var player = videojs('player', { "techOrder": $scope.mediaType.techOrder });
                        return player
                    };

                    var destroyPlayer = function(player) {
                        if (player) {
                            player.dispose();
                            player = null;
                        }
                    };

                    /**
                     * Player event listeners
                     */
                    var registerPlayerEventListeners = function() {
                        var onDurationChange = function() {
                            $scope.duration = $scope.player.duration();
                        };

                        if ($scope.player) {
                            $scope.player.on('durationchange', onDurationChange);
                        }
                    };

                    /**
                     * Player event handlers
                     */
                    var onReady = function() {
                        addKeyBindings();
                        startGetCurrentTime();
                        registerPlayerEventListeners();
                        $scope.playerReady = true;
                    };

                    var onDispose = function() {
                        destroyPlayer($scope.player);
                        removeKeyBindings();
                        stopGetCurrentTime();
                    };

                    /**
                     * Scope Data
                     */
                    $scope.sourceUrl = "http://www.youtube.com/watch?v=M7lc1UVf-VE";  // Default Source Url
                    $scope.mediaType = parseSourceUrl($scope.sourceUrl);
                    //$scope.sourceUrl = "http://video-js.zencoder.com/oceans-clip.mp4";  // Default Source Url
                    //$scope.mediaType = mediaTypes['MP4'];

                    $scope.player = createPlayer($scope.sourceUrl);
                    $scope.playerReady = false;

                    $scope.currentTime = 0;
                    $scope.duration = 0;
                    $scope.flags = [];
                    $scope.myTags = [];

                    /**
                     * Scope Functions
                     */
                    $scope.$watch("sourceUrl", function(newValue, oldValue) {
                        if (newValue !== oldValue) {
                            var parsedMediaType = parseSourceUrl(newValue);
                            if (parsedMediaType !== "unknown") {
                                $scope.mediaType = parsedMediaType;
                            } else {
                                $scope.sourceUrl = oldValue;
                            }
                            onDispose();
                            $scope.player = createPlayer(newValue);
                            $scope.playerReady = false;
                            $scope.currentTime = 0;
                            $scope.duration = 0;
                            $scope.flags = [];
                            $scope.myTags = [];
                            $scope.player.ready(onReady);
                        }
                    });

                    /**
                    * Flag / Tag handlers
                    */
                    $scope.addFlag = function() {
                        if ($scope.playerReady) {
                            $scope.flags.push($scope.currentTime);
                            $scope.flags = _.unique($scope.flags);
                        }
                    };

                    $scope.removeFlag = function(value) {
                        $scope.flags = _.without($scope.flags, value);
                    };

                    $scope.addTag = function() {
                        if ($scope.playerReady && $scope.duration) {
                            $scope.myTags.push(new tag($scope.currentTime, $scope.currentTime, ""));
                        }
                    };

                    $scope.removeTag = function(value) {
                        $scope.myTags = _.without($scope.myTags, value);
                    };

                    $scope.$on('$destroy', function () {
                        onDispose();
                    });

                    $scope.player.ready(onReady);
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