// TODO: Separate between user-dependent and default config
"use strict";

module.exports = {

    // ########################################################################################################################
    // User feature locks


    /**
     * Whether new users may still register
     */
    'registrationLocked': 0,

    /**
     * Whether user information may still be updated through the Profile page
     */
    'profileLocked': 0,

    'loginLocked': 0,



    // ########################################################################################################################
    // Developer feature locks

    /**
     * Whether developer options are enabled
     */
    'dev': 0,

    // ########################################################################################################################
    // Host + networking settings

    'hosts': ['localhost'],


    // ########################################################################################################################
    // Other misc settings

    /**
     * Use this locale on the server and for new clients who did not submit a preference
     */
    'defaultLocale': 'en',

    // ########################################################################################################################
    // Facebook settings

    // Test FB App settings
    'auth': {
        'facebookAppID': 'your app id here',
        'facebookAppSecret': 'your app secret here'
    },
    

    // ########################################################################################################################
    // Developer options

    /**
     * Whether to open the command line
     */
    'console': 0,

    /**
     * Whether to trace RPC calls on Client side
     */
    'traceClient': 1,

    /**
     * Whether to trace RPC calls on Host side
     */
    'traceHost': 1,


    // ########################################################################################################################
    // Mostly constant options

    'title': 'Sample App',

    // folder containing files, accessible by clients
    'uploadFolder': 'uploads/',

    // Connection & transport parameters
    'httpd': {
        /**
         * The port of the application
         */
        'port'     : '9123'
    },

    // these are the login details to connect to your MySQL DB
    // it should usually be the same as in your `LocalSettings.php`
    'db' : {
        'host'     : 'localhost',
        'user'     : 'root',
        'password' : 'r00t',
        'port'     : '3306',
        'database' : 'my_db',
        'reconnectDelay':   '5'
    },

    // logging configuration
    'logging' : {
        'defaultFile' : '_log/app.log',
        'dbFile' : '_log/db.log',
        'userFile': '_log/user.log',
    },

    // session configuration
    'session' : {
        // For more information, read: http://blog.teamtreehouse.com/how-to-create-totally-secure-cookies
        // session persists for 1 month:
        'lifetime' : 1000 * 60 * 60 * 24 * 30 * 1,
        
        // make sure to set the domain to disable sub-domains from getting your cookies!
        // domain can include the port
        // TODO: Support multiple domains
        'domain'   : undefined,
        
        // If there are multiple websites on the same domain, specify which part of the path is dedicated for this application
        'path'     : '/',

        // Max age in milliseconds. This tells the browser to keep the cookie.
        'maxAge'   : 1000 * 60 * 60 * 24 * 30 * 1
    },

    // NoGap component and application configuration
    'nogap': {
        'logging'      : {
            'verbose'   : 1
        },
        'longstacktraces': true,
        'lazyLoad'     : true,
        'baseFolder'   : 'components',

        // localizer and language parameters
        'localizer': {
            'folder': 'lang',
            'defaultLang' : 'en'
        },

        /**
         * WARNING: Do not randomly change the order of these files.
         *      Some components do not gracefully resolve dependencies (yet).
         */
        'files'        : [
            // core utilities (need to initialize first, for now)
            'util/RuntimeError',
            'util/CacheUtil',

            // core components
            'models/core/AppConfig',
            'models/core/User',

            // misc utilities
            'util/Auth',
            'util/MiscUtil',
            'util/Localizer',
            'util/Log',
            'util/ValidationUtil',
            'util/SimpleBooleanExpressions',
            'util/FacebookApi',

            // core UI components:
            'ui/UIMgr',
            'ui/Main',

            // guest + unregistered pages:
            'ui/guest/GuestPage',
            'ui/guest/ProfilePage',

            // user pages:
            'ui/home/HomePage',
            'ui/account/AccountPage'
        ]
    },
};
