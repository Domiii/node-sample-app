/**
 * All utilities required to verify and manage users.
 */
"use strict";

var componentsRoot = '../../';
var libRoot = componentsRoot + '../lib/';

var NoGapDef = require('nogap').Def;

var SequelizeUtil = require(libRoot + 'SequelizeUtil');


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
            /**
             * @const
             */
            UserRole: squishy.makeEnum({
                "Guest": 0,
                "Student": 1,
                "TA": 2,
                "Instructor": 3,
                
                /**
                 * This role is used for maintenance operations that may have severe consequences 
                 * and thus should not be executed by someone without understanding of how things work.
                 * However, by default, TAs and Instructors have this privilege level anyway because 
                 8 there is no one else to help take care of things.
                 */
                "Admin": 4
            }),

            isStaff: function(roleOrUser) {
                roleOrUser = roleOrUser || this.currentUser;
                if (!roleOrUser) return false;
                
                var role = roleOrUser.displayRole || roleOrUser;
                return role && role > this.UserRole.Student;
            },

            isStudent: function(roleOrUser) {
                roleOrUser = roleOrUser || this.currentUser;
                if (!roleOrUser) return false;
                
                var role = roleOrUser.displayRole || roleOrUser;
                return role && role >= this.UserRole.Student;
            },

            isGuest: function(roleOrUser) {
                roleOrUser = roleOrUser || this.currentUser;
                if (!roleOrUser) return true;
                
                var role = roleOrUser.displayRole || roleOrUser;
                return !role || role <= this.UserRole.Guest;
            },

            hasRole: function(otherRole, roleOrUser) {
                roleOrUser = roleOrUser || this.currentUser;
                if (!roleOrUser) return !otherRole || otherRole == this.UserRole.Guest;
                
                var userRole = roleOrUser.displayRole || roleOrUser;
                return userRole && userRole >= otherRole;
            },

            Private: {
                // Caches (static member)
                Caches: {
                    users: {
                        idProperty: 'uid'
                    }
                },


                // #################################################################################
                // Getters

                getCurrentUser: function() {
                    return this.currentUser;
                },

                getCurrentUserName: function() {
                    return this.currentUser ? this.currentUser.name : null;
                },
            }
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var UserModel;
        var GroupModel;
        var UserRole;

        // TODO: Updates
        // see: http://stackoverflow.com/a/8158485/2228771

        return {
            __ctor: function () {
                // all Associations to be included when fetching a user object from DB
                this.userAssociations = [];
            },

            initModel: function() {
                UserRole = this.UserRole;

                /**
                 * User object definition.
                 */
                return UserModel = sequelize.define('User', {
                    uid: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                    gid: {
                    	type: Sequelize.INTEGER.UNSIGNED,
                    	references: GroupModel,
                    	referencesKey: 'gid'
                    },
                    role: {type: Sequelize.INTEGER.UNSIGNED},
                    displayRole: {type: Sequelize.INTEGER.UNSIGNED},
                    name: Sequelize.STRING(100),
                    fullName: Sequelize.STRING(100),
                    studentId: Sequelize.STRING(100),
                    locale: Sequelize.STRING(20),
                    lastIp: Sequelize.STRING(100),
                },{
                    classMethods: {
                        onBeforeSync: function(models) {
                            // setup foreign key Associations here
                        },

                        onAfterSync: function(models) {
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists('bjt_user', ['uid'], { indexOptions: 'UNIQUE'}),
                                SequelizeUtil.createIndexIfNotExists('bjt_user', ['gid']),
                                SequelizeUtil.createIndexIfNotExists('bjt_user', ['role']),
                                SequelizeUtil.createIndexIfNotExists('bjt_user', ['name'], { indexOptions: 'UNIQUE'}),
                                SequelizeUtil.createIndexIfNotExists('bjt_user', ['fullName']),
                                SequelizeUtil.createIndexIfNotExists('bjt_user', ['studentId'], { indexOptions: 'UNIQUE'})
                            );
                        }
                    }
                });
            },

            /**
             * Change user values of any user.
             */
            updateUser: function(uid, values) {
                // TODO: In order for this to work properly, 
                //      we also have to update the corresponding instance object
                //      and notify all connected clients.
                throw new Error('NOT IMPLEMENTED YET');
            },

            Private: {
                Caches: {
                    users: {
                        members: {
                            compileReadObjectsQuery: function(queryInput) {
                                var queryData = {
                                    //include: Shared.User.userAssociations
                                };
                                if (queryInput && queryInput.gid) {
                                    // queryInput may contain gid, if given
                                    queryData.where = {
                                        gid: queryInput.gid
                                    };
                                }
                                return queryData;
                            }
                        }
                    }
                },


                __ctor: function () {
                    this.events = {
                        create: new squishy.createEvent(),
                        login: new squishy.createEvent(),
                        logout: new squishy.createEvent(),
                    };
                },

                // #################################################################################
                // Basic getters

                /**
                 * 
                 */
                isStaff: function() {
                    return this.Shared.isStaff(this.currentUser);
                },

                /**
                 * 
                 */
                isStudent: function() {
                    return this.Shared.isStudent(this.currentUser);
                },

                /**
                 * 
                 */
                isGuest: function() {
                    return this.Shared.isGuest(this.currentUser);
                },

                /**
                 * 
                 */
                hasRole: function(role) {
                    return this.Shared.hasRole(role, this.currentUser);
                },


                // #################################################################################
                // Initialization

                onNewClient: function() {
                },


                // #################################################################################
                // Internal login/logout management

                /**
                 * Called right after a user logged in.
                 */
                onLogin: function(user, isLogin) {
                    // TODO: re-generate session id to prevent repeat attack
                    var sess = this.Context.session;
                    //sess.regenerate(function() {
                        // fire login event
                        this.events.login.fire();

                        if (isLogin) {
                            this.Tools.log('has logged in.');
                        }
                        else {
                            this.Tools.log('visits page.');
                        }
                    //}.bind(this));
                },

                /**
                 * Called right before a user logs out.
                 */
                onLogout: function(){
                    // fire logout event
                    this.events.logout.fire();

                    console.log('User `' + this.currentUser.name + '` logged out.');
                },

                /**
                 * Query DB to validate user-provided credentials.
                 */
                tryLogin: function(authData, preferredLocale) {
                    // TODO: General login credentials

                    // query user from DB
                    var userName = authData.userName;
                    var queryData = {name: userName};
                    return this.findUser(queryData)
                    .bind(this)
                    .then(function(user) {
                        if (!user) {
                            // user does not exist
                            //if (this.Context.clientIsLocal) {
                                // localhost may create accounts
                            if (true) {
                                // during early development & testing
                                // just create a new account if it does not exist
                                return this.createAndLogin(userName, preferredLocale);
                            }
                            else {
                                // check if this is the first User
                                return Shared.User.UserModel.count()
                                .then(function(count) {
                                    if (count == 0)  {
                                        // this is the first user: Create & login
                                        return this.createAndLogin(userName, preferredLocale);
                                    }
                                    else {
                                        return Promise.reject('error.login.auth');
                                    }
                                });
                            }
                        }
                        else {
                            // set current user data
                            this.setCurrentUser(user);

                            // fire login event
                            this.onLogin(user, true);

                            // notify caller
                            return user;
                        }
                    });
                },

                /**
                 * Create new account and login right away
                 */
                createAndLogin: function(userName, preferredLocale) {
                    if (!preferredLocale || !Shared.Localizer.Default.localeExists(preferredLocale)) {
                        // fall back to system default locale
                        preferredLocale = Instance.BJTConfig.getValue('defaultLocale');
                    }
                    var queryData = {
                        name: userName, 
                        role: UserRole.Admin, 
                        displayRole: UserRole.Admin,

                        //locale: Shared.BJTConfig.getValue('defaultLocale') || 'en'
                        locale: preferredLocale
                    };
                    return UserModel.create(queryData)
                    .then(SequelizeUtil.getValuesFromRows)
                    .bind(this)
                    .then(function(user) {
                        // set current user data
                        this.setCurrentUser(user);

                        // fire creation and login events
                        this.events.create.fire();
                        this.onLogin(user, true);

                        return user;
                    });
                },

                /**
                 * This method is called upon bootstrap for user's with an established session.
                 */
                resumeSession: function() {
                    // log into account of given uid
                    var sess = this.Context.session;
                    var uid = sess.uid;

                    var loginAsGuest = function()  {
                        this.setCurrentUser(null);
                        return null;
                    };

                    if (uid) {
                        // resume session
                        var queryData = {uid: uid};
                        return this.findUser(queryData)
                        .bind(this)
                        .then(function(user) {
                            if (!user) {
                                // could not login -> Invalid session (or rather, User could not be found)
                                console.warn('Unable to login user from session -- ' + (err || ('invalid session ID')));
                                delete sess.uid;    // delete uid from session

                                return loginAsGuest.call(this);
                            }
                            else {
                                // set current user data
                                this.setCurrentUser(user);

                                // fire login event
                                this.onLogin(user, false);
                            	return user;
                            }
                        })
                        .catch(function(err) {
                            this.Tools.handleError(err);
                            return loginAsGuest.call(this);
                        });
                    }
                    else {
                        // no session to resume:
                        // login as guest
                        return loginAsGuest.call(this);
                    }
                },


                // #################################################################################
                // Misc getters & setters

                /**
                 * TODO: Use cache instead
                 */
                findUser: function(queryData) {
                    var query = {
                        where: queryData,
                        include: this.Shared.userAssociations
                    };

                    // query user from DB
                    return UserModel.find(query)
                    .then(SequelizeUtil.getValuesFromRows);
                },

                /**
                 * Change current user values.
                 */
                updateCurrentUserValues: function(values) {
                    if (!this.currentUser) {
                        console.error('Tried to call `updateCurrentUserValues` without `currentUser` set.');
                        return Promise.reject('error.invalid.request');
                    }

                    var uid = this.currentUser.uid;

                    // update DB
                    return UserModel.update(values, { where: {uid: uid } })
                    .bind(this)
                    .then(function() {
                        // update current user values
                        for (var propName in values) {
                            if (!values.hasOwnProperty(propName)) continue;

                            this.currentUser[propName] = values[propName];
                        }

                        // send updated user object to client
                        this.users.applyChange(this.currentUser);
                    });
                },

                /**
                 * This method is called when starting and upon successful login.
                 */
                setCurrentUser: function(user) {
                    console.assert(!user || user.uid, 'INTERNAL ERROR: Invalid user object has no `uid`');

                    var sess = this.Context.session;

                    // update memory cache
                    var uid = sess.uid = user && user.uid;
                    this.currentUser = user;

                    if (user) {
                        // send user object to client
                        this.users.applyChange(user);
                    }
                    this.client.setCurrentUser(uid);
                },

                /**
                 * Change currentUser's group.
                 */
                setCurrentUserGroup: function(group) {
                    if (!this.currentUser) {
                        console.error('Tried to call `setCurrentUserGroup` without `currentUser` set.');
                        return Promise.reject('error.internal');
                    }

                    var gid = (group && group.gid) || 0;
                    var values = {gid: gid};
                    var selector = { where: {uid: this.currentUser.uid} };
                    return Shared.User.Model.update(values, selector)
                    .bind(this)
                    .then(function() {
                        // user changed or left group:

                        // update current user object properties
                        this.currentUser.gid = gid;

                        // send updated user object to client and caller
                        this.users.applyChange(this.currentUser);
                        return group;
                    });
                },
            },


            Public: {

                /**
                 * Properly logout the current user
                 */
                logout: function() {
                    var sess = this.Context.session;

                    // delete session info & cached user
                    console.assert(sess.destroy, 'Unable to logout user: Session object is missing a `destroy` method. ' +
                        'Express sessions have this functionality for example.');

                    this.onLogout();

                    sess.destroy();
                    delete this.currentUser;

                    // refresh client
                    this.Tools.refresh();
                },
            },
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var UserRole;
        var thisInstance;

        return {
            __ctor: function () {
                UserRole = this.UserRole;
                thisInstance = this;
            },

            initClient: function() {
            },

            logout: function() {
                return this.host.logout();
            },

            getCurrentLocale: function() {
                var locale;
                var localizer = Instance.Localizer.Default;

                if (this.currentUser) {
                    // get user preference
                    locale = this.currentUser.locale;
                }

                if (!localizer.localeExists(locale)) {
                    locale = Instance.MiscUtil.guessBrowserLanguage();

                    if (!localizer.localeExists(locale)) {
                        // check if region-independent locale exists
                        // e.g. `de-CH` might not exist, but `de` might!
                        if (locale.indexOf('-') !== -1)
                            locale = locale.split('-')[0];

                        if (locale.indexOf('_') !== -1)
                            locale = locale.split('_')[0];

                        if (!localizer.localeExists(locale)) {
                            // unknown locale -> fall back to system default
                            locale = Instance.BJTConfig.getValue('defaultLocale');
                        }
                    }
                }
                return locale;
            },


            // ################################################################################################################
            // Client-side cache

            /**
             * Events for changes in user data.
             */
            events: {
                /**
                 * Called when data of `currentUser` changed.
                 */
                updatedCurrentUser: squishy.createEvent(/* currentUser */)
            },

            cacheEventHandlers: {
                users: {
                    updated: function(newValues) {
                        if (thisInstance.currentUser) {
                            // check if currentUser was changed
                            for (var i = 0; i < newValues.length; ++i) {
                                var userDelta = newValues[i];
                                if (userDelta.uid == thisInstance.currentUser.uid) {
                                    thisInstance.onCurrentUserChanged();
                                }
                            };
                        }
                    }
                }
            },

            getUser: function(uid) {
                return this.users.getObjectNow(uid);
            },

            /**
             * Called when currentUser or values of currentUser changed.
             */
            onCurrentUserChanged: function() {
                // update locale (it might have changed)
                if (Instance.Localizer.Default) {
                    var locale = this.getCurrentLocale();

                    // update localizer locale
                    Instance.Localizer.Default.setLocale(locale);

                    // update moment locale, too (for date + time formatting)
                    moment.locale(locale);
                }

                // notify main
                this.Instance.Main.onUserPrivChanged();

                // raise event
                this.events.updatedCurrentUser.fire(this.currentUser);
            },

            Public: {
                setCurrentUser: function(uid) {
                    this.currentUser = uid && this.getUser(uid);
                    this.onCurrentUserChanged();
                }
            }
        };
    })
});