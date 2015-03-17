/**
 * All utilities required to verify and manage users.
 */
"use strict";

var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
            Private: {
                // Caches (static member)
                Caches: {
                    groups: {
                        idProperty: 'gid',
                        InstanceProto: {
                            hasIcon: function() {
                                return !!this.iconFile;
                            },

                            /**
                             * The file name of the group's icon; without folder or extension.
                             */
                            getGroupIconIdentifier: function() {
                                return 'group_icon_' + this.gid;
                            },

                            getGroupIconFileName: function() {
                                if (!this.hasIcon()) return null;
                                return this.iconFile;
                            },

                            /**
                             * Gets file path of the current user's group's icon (if it has any)
                             */
                            getGroupIconFilePath: function() {
                                if (!this.hasIcon()) return null;

                                var uploadConfig = Shared.Group.uploads.groupIcons;
                                var uploadFolder = uploadConfig.uploadFolder;
                                return uploadFolder + this.getGroupIconFileName();
                            },

                            getGroupIconSrc: function() {
                                if (!this.hasIcon()) return null;

                                var uploadConfig = Shared.Group.uploads.groupIcons;
                                var downloadPath = uploadConfig.downloadPath;
                                return downloadPath + this.getGroupIconFileName();
                            }
                        },
                        members: {
                            // compileObjectCreate: function(queryInput, ignoreAccessChecks) {
                            // },

                            // compileObjectUpdate: function(queryInput, ignoreAccessChecks) {
                            // },
                        }
                        }
                },  // Caches

                mayEditGroup: function() {
                    //console.error([this.Instance.User.isStudent(), this.Instance.User.isStaff(), !Shared.AppConfig.getValue('groupsLocked')]);
                    return this.Instance.User.isStudent() &&
                        (this.Instance.User.isStaff() || !Shared.AppConfig.getValue('groupsLocked'));
                    }
            }
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var GroupModel;

        var appRoot = '../../../';
        var libRoot = appRoot + 'lib/';

        // SequelizeUtil
        var SequelizeUtil;

        // some Node modules for handling file uploads
        var multer,
            path,
            mime;

        var Identicon,
            SVGUtil;

        return {
            __ctor: function () {
                SequelizeUtil = require(libRoot + 'SequelizeUtil');
            },
                    
            /**
             * 
             */
            initHost: function(expressApp, cfg) {
                if (Shared.FileUpload) {
                    // get some modules we will need for the server
                    multer = require('multer');     // multipart file handling
                    path = require('path');
                    mime = require('mime');

                    Identicon = require(libRoot + 'svg/Identicon');
                    SVGUtil = require(libRoot + 'svg/SVGUtil');

                    // setup group icon uploads
                    this.groupIconUploadOptions = {
                        name: 'groupIcons',
                        component: this,
                        limits: null,

                        /**
                         * @param filenameWithoutExtension
                         * @return Target file name, without extension
                         */
                        rename: function (fieldname, filenameWithoutExtension) {
                            // get group icon file name
                            var user = this.Instance.User.currentUser;
                            return user && user.group && user.group.getGroupIconIdentifier();
                        },

                        onFileUploadStart: function (fileInfo) {
                            // check file type
                            var fileType = mime.lookup(fileInfo.name);
                            if (!fileType.startsWith('image/')) {
                                // only images are allowed
                                return false;
                            }

                            // Delete existing file if it has a different name
                            var user = this.Instance.User.currentUser;
                            var group = user && user.group;
                            var newFileName = fileInfo.name;
                            var oldFileName = group && group.getGroupIconFileName();

                            if (oldFileName && oldFileName !== newFileName) {
                                var iconUploads = Shared.Group.uploads.groupIcons;

                                // different file name -> Delete old one!
                                return iconUploads.deleteFile(oldFileName)
                                .bind(this)
                                .catch(function(err) {
                                    // should not matter too much
                                    this.Instance.Group.Tools.logWarn('Unable to delete Group icon file `' + oldFileName + '`: ' + err.stack);
                                });
                            }

                            //console.log('Client is uploading file:' + fileInfo.originalname + '  ...');
                        },

                        onFileUploadComplete: function (fileInfo) {
                            console.log('received file: ' + fileInfo.name);
                            return this.Instance.Group.updateGroupIcon(fileInfo.name);
                        }
                    };

                    Shared.FileUpload.registerUploadHandler(this.groupIconUploadOptions);
                }
            },

            initModel: function() {
                return GroupModel = sequelize.define('Group', {
                    gid: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                    creatorId: {type: Sequelize.INTEGER.UNSIGNED},
                    name: Sequelize.STRING(100),

                    // extension of the group's icon file
                    iconFile: Sequelize.STRING(100),
                },{
                    classMethods: {
                        onBeforeSync: function(models) {
                        },

                        onAfterSync: function(models) {
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists(this.tableName, ['gid'], { indexOptions: 'UNIQUE'}),
                                SequelizeUtil.createIndexIfNotExists(this.tableName, ['creatorId']),
                                SequelizeUtil.createIndexIfNotExists(this.tableName, ['name'], { indexOptions: 'UNIQUE'})
                            );
                        }
                    }
                });
            },

            /**
             * Delete group of given gid, if it has no more members.
             * TODO: Check that group did not contribute anything yet!
             */
            deleteIfEmpty: function(gid) {
                // check if any user is still in this group
                var queryData = {
                    where: ['gid = ?', gid]
                };
                return Shared.User.Model.count(queryData)
                .then(function(count) {
                    if (count > 0) {
                        return Promise.reject('error.invalid.request');
                    }
                    else {
                        // delete group
                        return GroupModel.destroy({where: {gid: gid }})
                        .then(function(affectedRows) {
                            // done!
                            
                        });
                    }
                });
            },

            Private: {
                __ctor: function () {
                    this.events = {
                    };
                },
                
                onClientBootstrap: function() {
                    // query & send all groups to client
                    return this.groups.applyChangesFromQuery();
                },

                /**
                 * Create new group with given name and creator.
                 */
                createGroup: function(groupName, creatorId) {
                    var newGroupData = {
                        name: groupName, 
                        creatorId: creatorId
                    };

                    // insert Group in DB
                    return this.groups.createObject(newGroupData, true)
                    .bind(this)
                    .then(function(group) {
                        // set group icon file name
                        group.iconFile = group.getGroupIconIdentifier() + '.svg';

                        // generate random Group identicon (width = 5)
                        return Identicon.generate(5)
                    	.bind(this)

                        .then(function(svg) {
                            // set group icon path
                            var fpath = group.getGroupIconFilePath();

                            // write to file
                            return SVGUtil.writeSvg(fpath, svg);
                        })

                        // update icon path in DB
                        .then(function() {
                        	var update = {
                        		gid: group.gid,
                        		iconFile: group.iconFile
                        	};
                            return this.groups.updateObject(update, true);
                        })

                        .then(function() {
                            // finally return new Group object
                            return group;
                        });
                    });
                },

                createAndJoinGroup: function(groupName) {
                    var creator = this.Instance.User.currentUser;
                    console.assert(creator, 'Called `createAndJoinGroup` while user was not logged in.');

                    return this.createGroup(groupName, creator.uid)
                    .bind(this)
                    .then(this.setCurrentUserGroup);
                },

                leaveGroup: function(alsoDelete) {
                    var user = this.Instance.User.currentUser;
                    var gid = user.gid;
                    console.assert(user, 'Called `leaveGroup` while user was not logged in.');

                    return this.setCurrentUserGroup(null)
                    .bind(this)
                    .then(function(group) {
                        if (alsoDelete && gid) {
                            // also try to delete this group
                            return this.Shared.deleteIfEmpty(gid);
                        }
                    });
                },

                /**
                 * Change currentUser's group.
                 * @param groupOrGid Either group object, group gid, or null.
                 */
                setCurrentUserGroup: function(groupOrGid) {
                    // update group in DB
                    var instance = this.Instance;

                    if (!groupOrGid || (groupOrGid && groupOrGid.gid)) {
                        // changed group, and `groupOrGid` contains all group data
                        var group = groupOrGid;
                        return this.Instance.User.setCurrentUserGroup(group);
                    }
                    else {
                        // changed group, but we only have gid -> look up group
                        var gid = groupOrGid;
                        return this.groups.getObject(gid)
                        .then(this.Instance.User.setCurrentUserGroup.bind(this.Instance.User));
                    }
                },

                updateGroupIcon: function(fileName) {
                    var user = this.Instance.User.currentUser;
                    var group = user && user.group;

                    if (!group) {
                        if (user && user.gid) {
                            return Promise.reject(new Error('User has group, but group object was not available during icon upload'));
                        }
                        else {
                            return Promise.reject('error.invalid.request');
                        }
                    }

                    // update icon info in DB
                    group.iconFile = fileName;
                    group.updatedAt = new Date();

                	var update = {
                		gid: group.gid,
                		iconFile: group.iconFile
                	};

                    return this.groups.updateObject(update, true);
                }
            },

            Public: {
                /**
                 * Delete icon file and update group in DB.
                 */
                deleteIconFile: function() {
                    if (!this.mayEditGroup()) {
                        return Promise.reject('error.invalid.permissions');
                    }

                    // TODO: Check for group alter permissions
                    if (!this.Shared.uploads) return;

                    var user = this.Instance.User.currentUser;
                    var group = user && user.group;

                    if (!group || !group.hasIcon()) {
                        return Promise.reject('error.invalid.request');
                    }

                    var uploadConfig = this.Shared.uploads.groupIcons;
                    var filePath = group.getGroupIconFileName();

                    return uploadConfig.deleteFile(filePath)
                    .bind(this)
                    .catch(function(err) {
                        // should not matter too much
                        this.Instance.Group.Tools.logWarn('Unable to delete Group icon file `' + filePath + '`: ' + err.stack);
                    })
                    .then(function() {
                        // deleted -> Update DB
                        return this.updateGroupIcon(null);
                    });
                }
            },
        };
    }),

    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {
            __ctor: function () {
            },

            events: {
            },


            // ################################################################################################
            // Handle server responses:

            Public: {
            }
        };
    })
});