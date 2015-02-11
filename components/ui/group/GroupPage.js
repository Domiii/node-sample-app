/**
 * This component takes care of rendering the "Group" page.
 */
"use strict";


var NoGapDef = require('nogap').Def;



module.exports = NoGapDef.component({
    Namespace: 'bjt',

    /**
     * Include these components with this component.
     */
    Includes: [
        'GroupScoreElement',
        'GroupIconElement'
    ],

    Base: NoGapDef.defBase(function() {
        return {
            /**
             * Treat these components as children of this page.
             */
            PageChildren: [
                'GroupScoreElement',
                'GroupIconElement'
            ]
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
                        template: 'GroupPage.html',
                    }
                },
                AutoIncludes: {
                }
            },
            
            /**
             * Public methods can be directly called by the client
             */
            Public: {
                createAndJoin: function(groupName) {
                	var user = this.Instance.User.currentUser;
                	if (!this.Instance.User.isStudent()) {
                        return Promise.reject('error.invalid.permissions');
                    }
                	else if (!(groupName = Shared.ValidationUtil.validateNameOrTitle(groupName))) {
                		// this should never happen, since the client already validates the group name
                		return Promise.reject('invalid group name: ' + groupName);
                	}
                	else {
                        // TODO: Check against activity schedules, if user actually may currently create group
                		return this.Instance.Group.createAndJoinGroup(groupName);
                	}
                },

                joinGroup: function(gid) {
                	var user = this.Instance.User.currentUser;
                	if (!user || user.role < Shared.User.UserRole.Student) return;

                	// TODO: Check if user actually may currently join group

                	return this.Instance.Group.setCurrentUserGroup(gid);
                },


                leaveGroup: function(alsoDelete) {
                	var user = this.Instance.User.currentUser;
                	if (!user || user.role < Shared.User.UserRole.Student) return;

                    // TODO: Check if user actually may currently leave group

            		return this.Instance.Group.leaveGroup(alsoDelete);
                }
            },
        };
    }),
    
    
    /**
     * Everything defined in `Client` lives only in the client.
     *
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var localizer;
    	var scope;
        var ThisComponent;

        return {
        	__ctor: function() {
                ThisComponent = this;
        		this.busy = {
        			ownGroup: false,
                    icon: false
        		};
        	},

            initClient: function() {
                // get some default utilities
                localizer = Instance.Localizer.Default;
            },

            /**
             * Group-specific directives
             */
            _addDirectives: function(app) {
            },

            /**
             *
             */
            setupUI: function(UIMgr, app) {
                ThisComponent._addDirectives(app);
                
                // create GroupPage controller
                app.lazyController('groupCtrl', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    /**
                     * Whenever the user does something, reset notifications.
                     */
                    var resetNotifications = function() {
                        $scope.groupMessage = null;
                        $scope.ownGroupError = null;
                        $scope.errorMessage = null;
                    };

                    // TODO: Get rid of this thing
                    scope = $scope;

                	// busy
                	$scope.busy = ThisComponent.busy;
                    $scope.allGroups = Instance.Group.groups;

                	// group-related variables
                    $scope.newGroupName = '';
                    
                    // predicate to only allow groups that are not the user's own
                    $scope.otherGroupsFilter = function(group) {
                        return !$scope.currentGroupGid || group.gid != $scope.currentGroupGid;
                    };


                    // #####################################################################################
                    // Group icon management

                    $scope.toggleEditIcon = function() {
                        resetNotifications();
                        $scope.editing = !$scope.editing;
                        $scope.selectedIconFiles = null;
                    };


                    $scope.uploadIconFile = function(files) {
                        resetNotifications();
                        var maxSize = Instance.FileUpload.DefaultUploadLimits.fileSize;

                        // check files
                        if (files.length != 1) {
                            // this will also be called when file dialog is cancelled
                            return;
                        }
                        if (files[0].size > maxSize) {
                            $scope.handleError('too big (max = ' + maxSize + ' bytes)');   // too big
                            return;
                        }

                        // send file to server
                        $scope.busy.icon = true;
                        Instance.Group.uploads.groupIcons.sendFiles(files)
                        .finally(function() {
                            $scope.busy.icon = false;
                        })
                        .then(function() {
                            // done!
                            $scope.selectedIconFiles = null;
                            $scope.groupMessage = Instance.Localizer.Default.lookUp('group.icon.uploaded');
                            $scope.safeDigest();
                        })
                        .catch($scope.handleError.bind($scope));
                    };


                    $scope.deleteIconFile = function() {
                        resetNotifications();
                        $scope.busy.icon = true;

                        Instance.Group.host.deleteIconFile()
                        .finally(function() {
                            $scope.busy.icon = false;
                        })
                        .then(function() {
                            // done!
                            $scope.groupMessage = Instance.Localizer.Default.lookUp('group.icon.deleted');
                            $scope.safeDigest();
                        })
                        .catch($scope.handleError.bind($scope));
                    };


                    // #####################################################################################
                    // Create/Leave/Delete Groups

                	$scope.clickCreateGroup = function() {
                		resetNotifications();
            			$scope.busy.ownGroup = true;

                		ThisComponent.host.createAndJoin($scope.newGroupName)
                        .finally(function() {
                            scope.busy.ownGroup = false;
                        })
                        .then(function(newGroup) {
                            //scope.groupMessage = localizer.lookUp('group.createdGroup', Instance.Group.groups.map[].name);
                            scope.groupMessage = localizer.lookUp('group.createdGroup', $scope.newGroupName);
                            scope.$digest();
                        })
                        .catch($scope.handleError.bind($scope));
                	};

                	$scope.clickLeaveGroup = function(alsoDelete) {
                		resetNotifications();
            			$scope.busy.ownGroup = true;

                        var gid = Instance.User.currentUser && Instance.User.currentUser.gid;
                        var group = gid && Instance.Group.groups && Instance.Group.groups.map[gid];
                        var groupName = group && group.name;

                		ThisComponent.host.leaveGroup(alsoDelete)
                        .finally(function() {
                            scope.busy.ownGroup = false;
                        })
                        .then(function(err) {
                            scope.groupMessage = localizer.lookUp('group.leftGroup', groupName);
                            if (alsoDelete) {
                                // deleted group -> remove from cache (for now, we have to do it manually)
                                Instance.Group.groups.removeFromCache(gid);
                            }

                            // by changing the group name to be something different from before,
                            //   we trigger the validator to re-validate the current value.
                            scope.newGroupName = (scope.newGroupName === null ? '' : null);
                            scope.$digest();
                        })
                        .catch($scope.handleError.bind($scope));
                	};

                	$scope.clickJoinGroup = function(group) {
                		resetNotifications();
            			$scope.busy.ownGroup = true;

                		ThisComponent.host.joinGroup(group.gid)
                        .finally(function() {
                            $scope.busy.ownGroup = false;
                        })
                        .then(function(newGroup) {
                            $scope.groupMessage = localizer.lookUp('group.joinedGroup', newGroup.name);
                            $scope.$digest();
                        })
                        .catch($scope.handleError.bind($scope));
                	};
                });

                // register page
                Instance.UIMgr.registerPage(this, 'Group', this.assets.template, {
                    //iconClasses: 'fa fa-users',
                    template: '<group-icon gid="currentGroupGid" size="tiny"></group-icon>',
                    right: 1,
                    getText: function() {
                        var allGroups = Instance.Group.groups;
                        var user = Instance.User.currentUser;
                        var currentGroup = user && user.gid && allGroups.map[user.gid]
                        return currentGroup && currentGroup.name || localizer.lookUp('page.Group');
                    }
                });
            },

            onPageActivate: function(pageArgs) {
            	// (re-)fetch dependent caches from Host
                Instance.User.users.readObjects();
                Instance.Group.groups.readObjects();

                //this.page.navButton.badgeValue += 100;    // test this

                // only show badge value temporarily
                var badgeValue = this.page.navButton.badgeValue;
                if (badgeValue != 0) {
                    // wait for 3 seconds
                    Promise.delay(3000)
                    .bind(this)
                    .then(function() {
                        if (this.page.navButton.badgeValue == badgeValue) {
                            // score did not change -> reset
                            this.page.navButton.badgeValue = 0;
                            scope.$apply();     // global refresh
                        }
                    });
                }
            },

            cacheEventHandlers: {
                groups: {
                    updated: function(newValues) {
                        if (!scope) return;
                        
                        scope.$digest();
                    }
                },
                users: {
                    updated: function(newValues, queryData, users) {
                        if (!scope) return;

                        // re-build group <-> user map
                        scope.usersByGid = {};
                        for (var i = 0; i < users.list.length; ++i) {
                            var user = users.list[i];
                            //if (user.gid) 
                            {
                                var usersOfGroup = scope.usersByGid[user.gid];
                                if (!usersOfGroup) {
                                    usersOfGroup = scope.usersByGid[user.gid] = [];
                                }
                                usersOfGroup.push(user);
                            }
                        };
                        scope.$digest();
                    }
                },
            },
            
            /**
             * Public methods can be directly called by the host
             */
            Public: {
            }
        };
    })
});