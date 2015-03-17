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

                /**
                 * Normal user who did not finish registration yet
                 */
                "Unregistered": 1,
                "Student": 2,
                "TA": 3,
                "Instructor": 4,
                
                /**
                 * This role is used for maintenance operations that may have severe consequences 
                 * and thus should not be executed by someone without understanding of how things work.
                 * However, by default, TAs and Instructors have this privilege level anyway because 
                 * there is no one else to help take care of things.
                 */
                "Admin": 5
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

                        hasHostMemorySet: 1,

                        indices: [
                            {
                                unique: true,
                                key: ['name']
                            },
                            {
                                unique: true,
                                key: ['facebookID']
                            },
                        ],

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
                        },

                        members: {
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

                    realName: Sequelize.STRING(100),
                    studentId: Sequelize.STRING(100),
                    locale: Sequelize.STRING(20),
                    lastIp: Sequelize.STRING(100),
                    facebookID: Sequelize.STRING(100),
                    facebookToken: Sequelize.STRING(100)
                },{
                    classMethods: {
                        onBeforeSync: function(models) {
                            This.userAssociations = [{
                                as: 'group',
                                model: models.Group
                            }];

                            // setup foreign key Association between user and group
                            models.User.belongsTo(models.Group,
                                { foreignKey: 'gid', as: 'group', foreignKeyConstraint: true });
                            models.Group.hasMany(models.User,
                                { foreignKey: 'gid', as: 'members', constraints: false });
                        },

                        onAfterSync: function(models) {
                            var tableName = this.getTableName();
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists(tableName, ['gid']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['role']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['name'], { indexOptions: 'UNIQUE'}),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['studentId'], { indexOptions: 'UNIQUE'}),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['facebookID'], { indexOptions: 'UNIQUE'})
                            );
                        }
                    }
                });
            },

            Private: {
                Caches: {
                    users: {
                        members: {
                            getObjectNow: function(queryInput, ignoreAccessCheck) {
                                if (!this.hasMemorySet()) return null;

                                if (!queryInput) return null;
                                if (!ignoreAccessCheck && !this.Instance.User.isStaff()) {
                                    // currently, this query cannot be remotely called by client
                                    return null;
                                }

                                if (queryInput.uid) {
                                    return this.byId[queryInput.uid];
                                }
                                else if (queryInput.facebookID) {
                                    return this.indices.facebookID.get(queryInput.facebookID);
                                }
                                else if (queryInput.name) {
                                    return this.indices.name.get(queryInput.name);
                                }
                                return null;
                            },

                            getObjectsNow: function() {
                                if (!this.hasMemorySet()) return null;
                            },

                            /**
                             * 
                             */
                            compileReadObjectQuery: function(queryInput, ignoreAccessCheck, sendToClient) {
                                // Possible input: uid, name, facebookID
                                if (!queryInput) {
                                    return Promise.reject('error.invalid.request');
                                }
                                if (!ignoreAccessCheck && !this.Instance.User.isStaff()) {
                                    // currently, this query cannot be remotely called by client
                                    return Promise.reject('error.invalid.permissions');
                                }

                                var queryData = {
                                    include: Shared.User.userAssociations,
                                    where: {},

                                    // ignore sensitive attributes
                                    attributes: Shared.User.visibleUserAttributes
                                };

                                if (queryInput.uid) {
                                    queryData.where.uid = queryInput.uid;
                                }
                                else if (queryInput.facebookID) {
                                    queryData.where.facebookID = queryInput.facebookID;
                                }
                                else if (queryInput.name) {
                                    queryData.where.name = queryInput.name;
                                }
                                else {
                                    console.error('Invalid user query: ' + queryInput);
                                    return Promise.reject('error.internal');
                                }

                                return queryData;
                            },

                            compileReadObjectsQuery: function(queryInput, ignoreAccessCheck, sendToClient) {
                                var queryData = {
                                    //include: Shared.User.userAssociations,

                                    // ignore sensitive attributes
                                    attributes: Shared.User.visibleUserAttributes
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
                 * Query DB to validate user-provided credentials.
                 */
                tryLogin: function(authData) {
                    // query user from DB
                    var queryInput;
                    var isFacebookLogin = !!authData.facebookID;
                    if (isFacebookLogin) {
                        // login using FB
                        queryInput = { facebookID: authData.facebookID };
                    }
                    else {
                        // login using userName
                        queryInput = { name: authData.userName };
                    }

                    return this.findUser(queryInput)
                    .bind(this)
                    .then(function(user) {
                        if (!user) {
                            // user does not exist
                            if (this.Context.clientIsLocal) {
                                // localhost may create accounts as Admin
                                authData.role = UserRole.Admin;
                                return this.createAndLogin(authData);
                            }
                            else {
                                // check if this is the first User
                                return UserModel.count()
                                .bind(this)
                                .then(function(count) {
                                    if (count == 0)  {
                                        // this is the first user: Create & login as Admin
                                        authData.role = UserRole.Admin;
                                        return this.createAndLogin(authData);
                                    }
                                    else if (isFacebookLogin) {
                                        // standard user
                                        authData.role = UserRole.Student;
                                        return this.createAndLogin(authData);
                                    }
                                    else {
                                        // invalid user credentials
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
                createAndLogin: function(authData) {
                    var preferredLocale = authData.preferredLocale;
                    
                    if (!preferredLocale || !Shared.Localizer.Default.localeExists(preferredLocale)) {
                        // fall back to system default locale
                        preferredLocale = Shared.AppConfig.getValue('defaultLocale') || 'en';
                    }
                    var queryData = {
                        name: authData.userName, 
                        role: authData.role, 
                        displayRole: authData.role,

                        //locale: Shared.AppConfig.getValue('defaultLocale') || 'en'
                        locale: preferredLocale,

                        facebookID: authData.facebookID,
                        facebookToken: authData.facebookToken
                    };

                    return this.users.createObject(queryData, true)
                    .bind(this)
                    .then(function(user) {
                        // set current user data
                        this.setCurrentUser(user);

                        // fire creation and login events
                        this.events.create.fire(user);
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
                        var queryInput = {uid: uid};
                        return this.findUser(queryInput)
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
                // Misc getters & setters

                /**
                 * TODO: Go through cache instead
                 */
                findUser: function(where) {
                    // query user from DB
                    return this.users.getObject(where, true, false, true)
                    .bind(this)
                    .then(function(user) {
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
                updateUserValues: function(user, values) {
                    if (!user) {
                        return Promise.reject('error.invalid.request');
                    }

                    // update DB
                    values.uid = user.uid;
                    return this.users.updateObject(values, true);
                },

                /**
                 * Only override current in-memory user context, don't do anything else
                 */
                setCurrentUserContext: function(user) {
                    this.currentUser = user;
                },


                /**
                 * This method is called when starting and upon successful login.
                 */
                setCurrentUser: function(user) {
                    console.assert(!user || user.uid, 'INTERNAL ERROR: Invalid user object has no `uid`');

                    var sess = this.Context.session;

                    // update currentUser and session data
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
                    return this.updateUserValues(this.currentUser, {gid: gid})
                    .bind(this)
                    .then(function() {
                    	// set group
                        this.currentUser.group = group;
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
                            // check if currentUser has changed
                            for (var i = 0; i < newValues.length; ++i) {
                                var userDelta = newValues[i];
                                if (userDelta.uid == ThisComponent.currentUser.uid &&
                                    (!ThisComponent._currentUserCopy ||
                                        !angular.equals(ThisComponent._currentUserCopy, ThisComponent.currentUser))) {
                                    // currentUser actually changed
                                    ThisComponent.onCurrentUserChanged();
                                    ThisComponent._currentUserCopy = _.clone(ThisComponent.currentUser);
                                    break;
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