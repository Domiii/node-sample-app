/**
 * 
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
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
                        template: 'VideoPlayerElement.html',
                    }
                },
                AutoIncludes: {
                }
            },

            __ctor: function() {
            },

            Private: {
            },

            Public: {

            }
        }
    }),

    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;

        var stageTransitionTimer;

        return {
            __ctor: function() {
                ThisComponent = this;
            },

            /**
             *
             */
            setupUI: function(UIMgr, app) {

                /*
                var linkFun = function($scope, $element, $attrs) {
                    // mandatory $scope setup
                    UIMgr.registerElementScope(ThisComponent, $scope);

                    setTimeout(function() {
                        ThisComponent._initializeYoutubeAPI();
                    });
                };
                */

                // create activity-overview directive
                app.lazyDirective('youtube', function() { return {
                    restrict: 'E',   // Element
                    scope: {
                        height:  "@",
                        width:   "@",
                        videoid: "@"  
                    },
                    replace:    true,
                    transclude: true,
                    link: function($scope, $element, $attrs) {
                        // mandatory $scope setup
                        UIMgr.registerElementScope(ThisComponent, $scope);
                        var tag = document.createElement('script');
                        tag.src = "https://www.youtube.com/iframe_api";
                        var firstScriptTag = document.getElementsByTagName('script')[0];
                        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                        var player;

                        window.onYouTubeIframeAPIReady = function() {
                            //console.log($element.children()[0]);
                            player = new YT.Player('player', {
                                height:  $scope.height,
                                width:   $scope.width,
                                videoId: $scope.videoid
                            });
                        };
                    },
                    template: this.assets.template,
                }; }.bind(this) );

                // register UI component
                UIMgr.registerElementComponent(this);
            },

            // ################################################################################################
            // Event handlers

            onPageActivate: function() {
                
            },

        }; 
    })
});