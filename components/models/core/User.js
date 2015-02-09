/**
 * All utilities required to verify and manage users.
 */
"use strict";

var NoGapDef = require('nogap').Def;


var componentsRoot = '../../';
var libRoot = componentsRoot + '../lib/';
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
                        idProperty: 'uid',
                        InstanceProto: {
                            getGroup: function() {
                                return this.gid && 
                                    (this.group ||
                                    this.Instance.Group.groups.getObjectNow(this.gid));
                            },
                            initialize: function(users) {
                                // add Instance object to new User instance
                                Object.defineProperty(this, 'Instance', {
                                    enumerable: false,
                                    value: users.Instance
                                });
                            }
                        }
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
            },

            initModel: function() {
                var This = this;
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
                    // debugMode: {type: Sequelize.INTEGER.UNSIGNED},
                    name: Sequelize.STRING(100),
                    fullName: Sequelize.STRING(100),
                    studentId: Sequelize.STRING(100),
                    locale: Sequelize.STRING(20),
                    lastIp: Sequelize.STRING(100),
                    facebookID: Sequelize.STRING(100),
                    facebookToken: Sequelize.STRING(100)
                },{
                    freezeTableName: true,
                    tableName: 'bjt_user',
                    classMethods: {
                        onBeforeSync: function(models) {
                            // setup foreign key Association between user and group
                            models.User.belongsTo(models.Group,
                                { foreignKey: 'gid', as: 'group', foreignKeyConstraint: true });
                            models.Group.hasMany(models.User,
                                { foreignKey: 'gid', as: 'members', constraints: false });

                            // all Associations to be included when fetching a user object from DB
                            This.userAssociations = [
                                // include group
                                {
                                    model: models.Group,
                                    as: 'group'
                                }
                            ];
                        },

                        onAfterSync: function(models) {
                            var tableName = models.User.getTableName();
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists(tableName, ['uid'], { indexOptions: 'UNIQUE'}),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['gid']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['role']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['name'], { indexOptions: 'UNIQUE'}),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['fullName']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['studentId'], { indexOptions: 'UNIQUE'})
                            );
                        }
                    }
                });
            },

            Private: {
                Caches: {
                    users: {
                        members: {
                            compileReadObjectQuery: function(queryInput) {
                                var queryData = {
                                    include: Shared.User.userAssociations
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
                 *
                 */
                tryLogin: function(authData, preferredLocale) {
                    // TODO: Real login credentials check
                    var userName = authData.userName;
                    return this.loginAs(userName, preferredLocale);
                },

                /**
                 * Query DB to validate user-provided credentials.
                 */
                loginAs: function(userName, preferredLocale) {
                    // query user from DB
                    var where = {name: userName};
                    return this.findUser(where)
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
                        preferredLocale = Shared.AppConfig.getValue('defaultLocale') || 'en';
                    }
                    var queryData = {
                        name: userName, 
                        role: UserRole.Admin, 
                        displayRole: UserRole.Admin,

                        //locale: Shared.AppConfig.getValue('defaultLocale') || 'en'
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
                        var where = {uid: uid};
                        return this.findUser(where)
                        .bind(this)
                        .then(function(user) {
                            if (!user) {
                                // could not login -> Invalid session (or rather, User could not be found)
                                console.warn('Unable to login user from session -- invalid or expired session');
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
                // Facebook login + signup

                tryLoginFacebook: function(authData, preferredLocale) {
     
                    return this.loginAsFacebook(authData, preferredLocale);
                },

                loginAsFacebook: function(authData, preferredLocale) {
                    // query user from DB
                    var queryData = {name: authData.userName, facebookID: authData.facebookID};
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
                                return this.createAndLoginFacebook(authData, preferredLocale);
                            }
                            else {
                                // check if this is the first User
                                return Shared.User.UserModel.count()
                                .then(function(count) {
                                    if (count == 0)  {
                                        // this is the first user: Create & login
                                        return this.createAndLoginFacebook(authData, preferredLocale);
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

                createAndLoginFacebook: function(authData, preferredLocale) {
                    if (!preferredLocale || !Shared.Localizer.Default.localeExists(preferredLocale)) {
                        // fall back to system default locale
                        preferredLocale = Shared.AppConfig.getValue('defaultLocale') || 'en';
                    }
                    var queryData = {
                        name: authData.userName, 
                        role: UserRole.Admin, 
                        displayRole: UserRole.Admin,

                        //locale: Shared.AppConfig.getValue('defaultLocale') || 'en'
                        locale: preferredLocale,

                        facebookID: authData.facebookID,
                        facebookToken: authData.facebookToken
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
                        console.error(user);
                        return user;
                    });
                },


                // #################################################################################
                // Misc getters & setters

                /**
                 * TODO: Go through cache instead
                 */
                findUser: function(where) {
                    var query = {
                        where: where,
                        include: this.Shared.userAssociations
                    };

                    // query user from DB
                    return UserModel.find(query)
                    .bind(this)
                    .then(function(_user) {
                        var user = SequelizeUtil.getValuesFromRows(_user, query.include);
                        // TODO: Also wrap user object

                        if (user && user.group) {
                            // wrap Group object
                            user.group = this.Instance.Group.groups.wrapObject(user.group);
                        }
                        return user;
                    });
                },


                /**
                 * Change current user values.
                 */
                updateCurrentUserValues: function(values) {
                    if (!this.currentUser) {
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

                    var gid = (group && group.gid) || null;
                    var values = {gid: gid};
                    var selector = { where: {uid: this.currentUser.uid} };
                    return Shared.User.Model.update(values, selector)
                    .bind(this)
                    .then(function() {
                        // user changed or left group:

                        // update current user object properties
                        this.currentUser.gid = gid;
                        this.currentUser.group = group;

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
        var ThisComponent;

        return {
            __ctor: function () {
                UserRole = this.UserRole;
                ThisComponent = this;
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
                            locale = Instance.AppConfig.getValue('defaultLocale');
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
                        if (ThisComponent.currentUser) {
                            // check if currentUser was changed
                            for (var i = 0; i < newValues.length; ++i) {
                                var userDelta = newValues[i];
                                if (userDelta.uid == ThisComponent.currentUser.uid) {
                                    ThisComponent.onCurrentUserChanged();
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