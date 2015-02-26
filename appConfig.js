// TODO: Separate between user-dependent and default config
"use strict";

module.exports = {

    // ########################################################################################################################
    // Other customizable settings

    'defaultLocale': 'en',

    /**
     * If # ratings is below this number, do not display the rating results yet.
     */
    'minItemRatingsToDisplay': 1,

    // ########################################################################################################################
    // Facebook settings

    'facebookAppID': '369298383249820',
    'facebookAppSecret': '8ab2043f222dc5db2065f1658151e071',
    'facebookCallbackUrl': 'http://localhost:9123/auth/facebook/callback',


    // ########################################################################################################################
    // Mostly constant options

    'title': 'BJT Online',

    // folder containing files, accessible by clients
    'publicFolder': 'pub',

    'uploadFolder': 'uploads/',

    /**
     * Whether to open the command line
     */
    'console': 0,

    'dev': 1,

    'debug': 1,

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

    // define session parameters
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
        'publicFolder' : './pub',
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
            'util/CacheUtil',
            'util/FileUpload',

            // core components
            'models/core/AppConfig',
            'models/core/User',
            'models/core/Group',

            // misc utilities
            'util/Auth',
            'util/MiscUtil',
            'util/Localizer',
            'util/Log',
            'util/ValidationUtil',
            'util/SimpleBooleanExpressions',

            // core UI components:
            'ui/UIMgr',
            'ui/Main',
            'ui/NavbarElement',

            // guest pages:
            'ui/guest/GuestPage',

            // user pages:
            'ui/home/HomePage',
            'ui/group/GroupPage',
            'ui/account/AccountPage',
            'ui/admin/AdminPage',

            // video pages:
            'ui/video_page/VideoPage',

            // contact pages:
            'ui/contact_us/ContactPage'


        ]
    },
};