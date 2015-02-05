// TODO: Separate between user-dependent and default config

var config = {
    // we are in development mode
    'dev': 1,

    'title': 'Awesome Presentations!',

    /**
     * Whether to open the command line
     */
    'console': 1,
    
    'defaultLocale': 'en',

    // folder containing files, accessible by clients
    'publicFolder': 'pub',

    // Connection & transport parameters
    'httpd': {
        /**
         * The port of the application.
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

    // define log files
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

    // configure NoGap components
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
            // core utilities
            'util/CacheUtil',

            // core components
            'models/core/AppConfig',
            'models/core/User',
            'models/core/Group',

            // misc utilities
            'util/MiscUtil',
            'util/Localizer',
            'util/Log',
            'util/ValidationUtil',
            'util/SimpleBooleanExpressions',

            // core UI components:
            'ui/UIMgr',
            'ui/Main',

            // guest pages:
            'ui/guest/GuestPage',

            // user pages:
            'ui/home/HomePage',
            'ui/account/AccountPage',

            // video pages:
            'ui/video_page/VideoPage',

            // contact pages:
            'ui/contact_us/ContactPage'


        ]
    },
};

module.exports = config;