/**
 * The Arduino component provides an interface to an Arduino device through the `duino` library
 */
"use strict";
var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    /**
     * Base is available in both, host and client.
     */
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	var defaultDelta = 5;

        return {
        	increaseBrightness: function(delta) {
        		delta = delta || defaultDelta;

        		this.setLEDBrightness(Math.min(255, this.getLEDBrightness() + delta));
        	},

        	decreaseBrightness: function(delta) {
        		delta = delta || defaultDelta;

        		this.setLEDBrightness(Math.max(0, this.getLEDBrightness() - delta));
        	},

        	setLED: function(onOff) {
        		if (onOff) {
        			this.setLEDBrightness(255);
        		}
        		else {
        			this.setLEDBrightness(0);
        		}
        	}
        };
    }),

    /**
     * Everything defined in Host will live in the host context (here).
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
    	var ThisComponentShared;
    	var arduino,
    		board,
    		led;

        return {
        	__ctor: function() {
        		ThisComponentShared = this;
        	},

        	initHost: function() {
				arduino = require('duino');

			    board = new arduino.Board({
			    	baudrate: 9600
			    });

				led = new arduino.Led({
				  board: board,
				  pin: 13
				});

				board.on('ready', function() {
					//ThisComponentShared.setLED(1);

					Promise.delay(100)
					.then(function() {
						ThisComponentShared.setLED(1);
					});
					// .delay(200)
					// .then(function() {
					// 	led.brightLevel(0);
					// .delay(200)
					// .then(function() {
					// 	led.brightLevel(255);
					// });
				});
			},

			setLEDBrightness: function(brightness) {
				// TODO: high/low is reversed for some weird reason
				// see: http://stackoverflow.com/questions/57803/how-to-convert-decimal-to-hex-in-javascript
				led.brightLevel(brightness);

				// if (brightness > 0) {
				// 	led.on();
				// }
				// else {
				// 	led.off();
				// }
			},

			getLEDBrightness: function() {
				return led.bright;
			},

	        Private: {
	            getClientCtorArguments: function() {
	                return [this.Shared.getLEDBrightness()];
	            }
	        },
            
            /**
             * Public commands can be directly called by the client
             */
            Public: {
            	setLEDBrightness: function(brightness) {
            		this.Shared.setLEDBrightness(brightness);
            	}
            }
        };
    }),
    
    
    /**
     * Everything defined in `Client` lives only in the client.
     *
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
    	var brightness;

    	return {
    		__ctor: function(currentBrightness) {
    			brightness = currentBrightness;
    		},

			getLEDBrightness: function() {
				return brightness;
			},

			setLEDBrightness: function(_brightness) {
				brightness = _brightness;
				return this.host.setLEDBrightness(brightness);
			},

            /**
             * Client commands can be directly called by the host
             */
            Public: {
            }
        };
    })
});

