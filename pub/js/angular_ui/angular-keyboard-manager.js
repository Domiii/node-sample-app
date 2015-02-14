/**
 * Created by Derek on 2015/2/14.
 * Angular keyboard manager is an angular module used to manage key bindings on DOM
 * Based on
 * @url http://stackoverflow.com/questions/15044494/what-is-angularjs-way-to-create-global-keyboard-shortcuts
 * and
 * @url http://jsfiddle.net/firehist/nzUBg/
 * @Reference http://www.openjs.com/scripts/events/keyboard_shortcuts/index.php
 */
angular.module('keyboard-manager', [])
    .factory('keyboardManager', ['$window', '$timeout', function ($window, $timeout) {
        var keyboardManagerService = {};

        var defaultOption = {
            'type'        : 'keydown',
            'propagate'   : false,
            'inputDisabled': false,
            'target'      : $window.document,
            'keyCode'     : false
        };
        // Store all keyboard combination shortcuts
        keyboardManagerService.keyboardEvent = {};
        // Add a new keyboard combination shortcut
        keyboardManagerService.bind = function (label, callback, option) {
            var funct, element, code, key;
            // Initialize opt object
            option = angular.extend({}, defaultOption, option);
            label = label.toLowerCase();
            element = option.target;
            if (typeof option.target == 'string') element = document.getElementById(option.target);

            funct = function (event) {
                event = event || $window.event;

                // Disable event handler when focus input and textarea
                if (option['inputDisabled']) {
                    var element;
                    if (event.target) element = event.target;
                    else if (event.srcElement) element = event.srcElement;
                    if (element.nodeType == 3) element = element.parentNode;
                    if (element.tagName == 'INPUT' || element.tagName == 'TEXTAREA') return;
                }

                // Find out which key is pressed
                if (event.keyCode) code = event.keyCode;
                else if (event.which) code = event.which;
                var character = String.fromCharCode(code).toLowerCase();


                if (code == 188) character = ","; // If the user presses , when the type is onkeydown
                if (code == 190) character = "."; // If the user presses . when the type is onkeydown

                var keys = label.split("+");
                // Key Pressed - counts the number of valid keypresses - if it is same as the number of keys, the shortcut function is invoked
                var keyPressedCount = 0;
                // Work around for stupid Shift key bug created by using lowercase - as a result the shift+num combination was broken
                var shift_nums = {
                    "`" : "~",
                    "1" : "!",
                    "2" : "@",
                    "3" : "#",
                    "4" : "$",
                    "5" : "%",
                    "6" : "^",
                    "7" : "&",
                    "8" : "*",
                    "9" : "(",
                    "0" : ")",
                    "-" : "_",
                    "=" : "+",
                    ";" : ":",
                    "'" : "\"",
                    "," : "<",
                    "." : ">",
                    "/" : "?",
                    "\\": "|"
                };
                // Special Keys - and their codes
                var special_keys = {
                    'esc'      : 27,
                    'escape'   : 27,
                    'tab'      : 9,
                    'space'    : 32,
                    'return'   : 13,
                    'enter'    : 13,
                    'backspace': 8,

                    'scrolllock' : 145,
                    'scroll_lock': 145,
                    'scroll'     : 145,
                    'capslock'   : 20,
                    'caps_lock'  : 20,
                    'caps'       : 20,
                    'numlock'    : 144,
                    'num_lock'   : 144,
                    'num'        : 144,

                    'pause': 19,
                    'break': 19,

                    'insert': 45,
                    'home'  : 36,
                    'delete': 46,
                    'end'   : 35,

                    'pageup' : 33,
                    'page_up': 33,
                    'pu'     : 33,

                    'pagedown' : 34,
                    'page_down': 34,
                    'pd'       : 34,

                    'left' : 37,
                    'up'   : 38,
                    'right': 39,
                    'down' : 40,

                    'f1' : 112,
                    'f2' : 113,
                    'f3' : 114,
                    'f4' : 115,
                    'f5' : 116,
                    'f6' : 117,
                    'f7' : 118,
                    'f8' : 119,
                    'f9' : 120,
                    'f10': 121,
                    'f11': 122,
                    'f12': 123
                };
                // Some modifiers key
                var modifiers = {
                    shift: {
                        wanted : false,
                        pressed: event.shiftKey ? true : false
                    },
                    ctrl : {
                        wanted : false,
                        pressed: event.ctrlKey ? true : false
                    },
                    alt  : {
                        wanted : false,
                        pressed: event.altKey ? true : false
                    },
                    meta : { // Meta is Mac specific
                        wanted : false,
                        pressed: event.metaKey ? true : false
                    }
                };
                // Foreach keys in label (split on +)
                for (var i = 0, keyNum = keys.length; key = keys[i], i < keyNum; i++) {
                    switch (key) {
                        case 'ctrl':
                        case 'control':
                            keyPressedCount++;
                            modifiers.ctrl.wanted = true;
                            break;
                        case 'shift':
                        case 'alt':
                        case 'meta':
                            keyPressedCount++;
                            modifiers[key].wanted = true;
                            break;
                    }

                    if (key.length > 1) { // If it is a special key
                        if (special_keys[key] == code) keyPressedCount++;
                    }
                    else if (option['keyCode']) { // If a specific key is set into the config
                        if (option['keyCode'] == code) keyPressedCount++;
                    }
                    else { // The special keys did not match
                        if (character == key) keyPressedCount++;
                        else {
                            if (shift_nums[character] && event.shiftKey) { // Stupid shift key bug created by using lowercase
                                character = shift_nums[character];
                                if (character == key) keyPressedCount++;
                            }
                        }
                    }
                }

                if (keyPressedCount == keys.length &&
                    modifiers.ctrl.pressed == modifiers.ctrl.wanted &&
                    modifiers.shift.pressed == modifiers.shift.wanted &&
                    modifiers.alt.pressed == modifiers.alt.wanted &&
                    modifiers.meta.pressed == modifiers.meta.wanted) {
                    $timeout(function () {
                        callback(event);
                    }, 1);

                    if (!option['propagate']) {  // Stop the event
                        // e.cancelBubble is supported by IE - this will kill the bubbling process.
                        event.cancelBubble = true;
                        event.returnValue = false;

                        // e.stopPropagation works in Firefox.
                        if (event.stopPropagation) {
                            event.stopPropagation();
                            event.preventDefault();
                        }
                        return false;
                    }
                }
            };

            // Store shortcut
            keyboardManagerService.keyboardEvent[label] = {
                'callback': funct,
                'target'  : element,
                'event'   : option['type']
            };

            // Attach the function with the event
            if (element.addEventListener) element.addEventListener(option['type'], funct, false);
            else if (element.attachEvent) element.attachEvent('on' + option['type'], funct);
            else element['on' + option['type']] = funct;
        };

        // Remove the shortcut - just specify the short and I will remove the binding
        keyboardManagerService.unbind = function (label) {
            label = label.toLowerCase();
            var binding = keyboardManagerService.keyboardEvent[label];
            delete(keyboardManagerService.keyboardEvent[label]);
            if (!binding) return;
            var type = binding['event'],
                element = binding['target'],
                callback = binding['callback'];
            if (element.detachEvent) element.detachEvent('on' + type, callback);
            else if (element.removeEventListener) element.removeEventListener(type, callback, false);
            else element['on' + type] = false;
        };

        return keyboardManagerService;
    }]);
