/**
 * ActivitySchedule keeps track of Stages and basically 
 * defines configurable, time-dependent access management.
 * 
 */
"use strict";

var componentsRoot = '../../';
var libRoot = componentsRoot + '../lib/';

var NoGapDef = require('nogap').Def;

var SequelizeUtil = require(libRoot + 'SequelizeUtil');


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        var expressionEvaluator;

        var TypeId,
            ActionType;

        var idVerifier = function(identifier, error) {
            if (!Shared.WorkItemAccess.hasAccessCheck(identifier)) {
                // generate error, so evaluation will fail
                error('Expression identifier does not exist `' + identifier + 
                    '`. Valid identifiers are [' + Shared.WorkItemAccess.getAllAccessCheckKeys() + '].');
            }
            return true;
        };

        return {
            /** 
             * Since there is no infinity in MySql, we just pick a very large number as approximation.
             * In fact, this is 2e31 - 1; the largest signed integer value.
             */
            InfiniteStageDuration: 2147483647,

            initBase: function() {
                // create evaluator
                expressionEvaluator = Shared.SimpleBooleanExpressions.createEvaluator();

                TypeId = Shared.ObjectTypes.TypeId;
                ActionType = Shared.WorkItems.ActionType;                
            },


            /**
             * Validate the given schedule before updating or inserting it.
             * Returns an error if anything is wrong with it.
             */
            validateSchedule: function(schedule) {
                // fix stages
                var stages = schedule.stages;
                if (stages) {
                    for (var i = 0; i < stages.length; ++i) {
                        var stage = stages[i];
                        stage.scheduleId = schedule.scheduleId;

                        // validate permissions
                        var err = this.validateStage(stage);
                        if (err) {
                            return err;
                        }
                    }
                }

                return null;
            },


            /**
             * Validate the given stage.
             * Returns an error if anything is wrong with it.
             */
            validateStage: function(stage) {
                // verifier for permissions
                var permissions = stage.permissions;

                if (permissions) {
                    // iterate over all permissions
                    for (var iPermission = 0; iPermission < permissions.length; ++iPermission) {
                        var permission = permissions[iPermission];
                        this.validatePermission(permission);
                        permission.stageId = stage.stageId;
                    }
                }
            },

            /**
             * Validate the given permission.
             * Returns an error if anything is wrong with the given permission.
             */
            validatePermission: function(permission) {
                var typeId = permission.typeId;
                var actionType = permission.actionType;
                var expression = permission.expression;

                if (!TypeId.isDefined(typeId)) {
                    // return an error
                    // TODO: Localization
                    throw new Error('Permission has invalid property `typeId`. ' + 
                        'It should be (but is not) an `TypeId` enum value: ' + typeId);
                }

                if (!ActionType.isDefined(actionType)) {
                    // return an error
                    // TODO: Localization
                    throw new Error('Permission has invalid property `actionType`. ' + 
                        'It should be (but is not) an `ActionType` enum value: ' + actionType);
                }

                if (expression) {
                    if (!_.isString(expression)) {
                        // return an error
                        // TODO: Localization
                        throw new Error('Permission has invalid property `expression`. ' + 
                            'It should be (but is not) a "permission expression" string: ' + expression);
                    }

                    // verify that the expression can be evaluated
                    if (!expressionEvaluator.evaluate(expression, idVerifier)) {
                        throw new Error('Could not parse permission expression `' + expression + '`: ' +
                            expressionEvaluator.getError());
                    }
                }

                // no error
            },

            Private: {
                // Caches
                Caches: {
                    schedules: {
                        idProperty: 'scheduleId',
                        members: {
                            compileReadObjectQuery: function(queryInput) {
                                if (isNaN(queryInput)) {
                                    return Promise.reject('error.invalid.request');
                                }

                                var queryData = {
                                    // include stages and stage access conditions
                                    include: Shared.Activity.activityScheduleAssociations,

                                    // order schedules, as well as stages
                                    order: Shared.Activity.activityScheduleOrder,

                                    where: {
                                        scheduleId: queryInput
                                    }
                                };
                                return queryData;
                            },

                            compileReadObjectsQuery: function(queryInput) {
                                var queryData = {
                                    // include stages and stage access conditions
                                    include: Shared.Activity.activityScheduleAssociations,

                                    // order schedules, as well as stages
                                    order: Shared.Activity.activityScheduleOrder
                                };
                                return queryData;
                            }
                        }
                    } // schedules
                }, // Caches
            }
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var TypeId,
            ActionTarget,
            ActionType;

        var ActivityScheduleModel,
            ActivityScheduleStage,
            ActivityScheduleStageAccessPermission;

        return {
            __ctor: function () {
            },

            initHost: function() {
                TypeId = Shared.ObjectTypes.TypeId;
                ActionType = Shared.WorkItems.ActionType;
                ActionTarget = Shared.WorkItems.ActionTarget;

                ActivityScheduleStage = Shared.ActivityScheduleStage;
                ActivityScheduleStageAccessPermission = Shared.ActivityScheduleStageAccessPermission;
            },


            // #########################################################################################################
            // Initialization & Setup

            initModel: function() {
                var This = this;

                /**
                 * ActivitySchedule model definition.
                 */
                return ActivityScheduleModel = sequelize.define('ActivitySchedule', {
                    scheduleId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                    name: Sequelize.STRING(100),
                    description: Sequelize.TEXT,
                    order: Sequelize.INTEGER.UNSIGNED
                },{
                    freezeTableName: true,
                    tableName: 'bjt_activity_schedule',
                    classMethods: {
                        onBeforeSync: function(models) {
                        },

                        onAfterSync: function(models) {
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists('bjt_activity_schedule', ['scheduleId']),
                                SequelizeUtil.createIndexIfNotExists('bjt_activity_schedule', ['name']),

                                // add default schedules if table is empty
                                This.Model.count()
                                .then(function(count) {
                                    if (!count) {
                                        // Table is empty ->
                                        // insert default schedules for reference and developers
                                        return This._insertDefaultSchedules();
                                    }
                                })
                            );
                        }
                    }
                });
            },

            /**
             * Builds DB-ready permission entries.
             * Returns an error if any of the given arguments are invalid.
             */
            buildPermissions: function(typeId, permissionsList) {
                var records = [];
                if (!TypeId.isDefined(typeId)) {
                    // return an error
                    throw new Error('Invalid first argument for `buildPermissions` is not ' + 
                        'a valid `TypeId` enum value: ' + typeId);
                }

                // iterate over all permission lists
                for (var iPermissions = 0; iPermissions < permissionsList.length; ++iPermissions) {
                    var permissions = permissionsList[iPermissions];
                    var actionType = permissions.actionType;
                    var expressions = permissions.expressions;

                    if (!ActionType.isDefined(actionType)) {
                        // return an error
                        throw new Error('Invalid entry #' + (iPermissions) + ' in `permissionLists` is not a ' + 
                            'valid `ActionType` enum value: ' + actionType);
                    }

                    if (permissions && (permissions instanceof Array)) {
                        // return an error
                        throw new Error('Invalid entry #' + (iPermissions) + ' in `permissionLists` is not an ' + 
                            'array of "permission expression" strings: ' + permissions);
                    }

                    // iterate over all expressions
                    for (var iExpression = 0; iExpression < expressions.length; iExpression++) {
                        var expression = expressions[iExpression];

                        // add permission entry
                        var permission = {
                            typeId: typeId,
                            actionType: actionType,
                            expression: expression
                        };
                        records.push(permission);
                    };
                }

                return records;
            },

            
            // ###########################################################################################
            // DB: Create

            // TODO: Updating schedule, stages and permissions, if already existed
            insertSchedule: function(schedule) {
                // fix schedule and all its nested properties
                var validationError = this.validateSchedule(schedule);
                if (validationError) {
                    // invalid schedule object
                    return Promise.reject(validationError);
                }
                else {
                    // get stages
                    var stages = schedule.stages;
                    delete schedule.stages;

                    // insert schedule into DB
                    this.Model.create(schedule)
                    .bind(this)
                    .then(function(newSchedule) {
                        var scheduleId = newSchedule.scheduleId;

                        // insert stages
                        return this._insertStages(scheduleId, stages);
                    });
                }
            },

            _insertStages: function(scheduleId, stages) {
                var nPermissions = [];
                var allPermissions = [];

                // prepare all stages and get all permissions for bulk insertion
                for (var iStage = 0; iStage < stages.length; ++iStage) {
                    var stage = stages[iStage];
                    stage.scheduleId = scheduleId;

                    // get permissions
                    var permissions = stage.permissions;
                    delete stage.permissions;
                    nPermissions.push(permissions.length);
                    for (var iPermission = 0; iPermission < permissions.length; ++iPermission) {
                        allPermissions.push(permissions[iPermission]);
                    };
                }

                // insert stages into DB
                return SequelizeUtil.bulkCreate(ActivityScheduleStage.Model, stages)
                .then(function(newStages) {
                    if (permissions) {
                        // add `stageId` to every permission entry
                        var iPermission = 0;
                        for (var iStage = 0; iStage < newStages.length; ++iStage) {
                            var newStage = newStages[iStage];
                            var nPermissionsOfStage = nPermissions[iStage];
                            var iPermissionEnd = iPermission + nPermissionsOfStage;

                            // iterate over all permissions of stage
                            for (; iPermission < iPermissionEnd; ++iPermission) {
                                var permission = allPermissions[iPermission];
                                permission.stageId = newStage.stageId;
                            }
                        };

                        // insert permissions to DB
                        // see: http://sequelizejs.com/docs/1.7.8/instances#bulk
                        return SequelizeUtil.bulkCreate(ActivityScheduleStageAccessPermission.Model, allPermissions);
                    }
                });
            },

            /**
             * TODO: Convert a schedule in convenient (better human readable) notation 
             *    to a schedule in DB row format.
             */
            deserializeSchedule: function(stageDescription) {
                // get access list and remove from stage object
                var accessList = stageDescription.accessList = [];
                var accessByCategoryAndActionAndAccessType = stageDescription.access;
                delete stageDescription.access;

                // iterate over access list and convert to standard form
                for (var typeId in accessByCategoryAndActionAndAccessType) {
                    var accessByActionAndAccessType = accessByCategoryAndActionAndAccessType[typeId];
                    for (var actionType in accessByActionAndAccessType) {
                        var accessMap = accessByActionAndAccessType[actionType];
                        for (var accessCheckType in accessMap) {
                            var required = accessMap[accessCheckType];
                            accessList.push({
                                TypeId: TypeId,
                                actionType: actionType,
                                accessCheckType: accessCheckType,
                                required: required
                            });
                        }
                    }
                }

                return accessList;
            },
            
            Private: {
                __ctor: function () {
                    this.events = {
                    };
                },

                onNewClient: function() {
                },

                onClientBootstrap: function() {
                }
            },


            Public: {

                // ####################################################################################
                // CUD (Create, Update, Delete) operations for schedule and its associations



                // ##################################
                // Stage CUD

                createStage: function(newStageValues) {
                	// TODO: Integrate with CacheUtil instead
                	return Promise.reject('error.invalid.nyi');

                    var scheduleId = newStageValues && newStageValues.scheduleId;
                    if (!this.Instance.User.isStaff()) {
                        return Promise.reject('error.invalid.permissions');
                    }
                    else if (isNaN(scheduleId)) {
                        // invalid arguments
                        return Promise.reject('error.invalid.request');
                    }
                    else {
                        var user = this.Instance.User.currentUser;
                        var selector = { where: { scheduleId: scheduleId } };

                        // perform two queries at once
                        return Promise.join(
                            // make sure, schedule exists
                            this.Shared.Model.count(selector)
                            //// count amount of stages of schedule
                            //ActivityScheduleStage.Model.count(selector)
                        )
                        .spread(function(scheduleMatch) {
                            if (!scheduleMatch) {
                                // schedule does not exist
                                return Promise.reject('error.invalid.request');
                            }
                            // create stage
                            return ActivityScheduleStage.Model.create(newStageValues)
                            .then(SequelizeUtil.getValuesFromRows)
                            .then(function(newStage) {
                                if (!newStage) {
                                    // this should not happen
                                    console.trace('Could not create new stage');
                                    return Promise.reject('error.internal');
                                }
                                else {
                                    // new schedule created
                                    return newStage;
                                }
                            }.bind(this));
                        }.bind(this));
                    }
                },

                updateStage: function(stageId, values) {
                	// TODO: Integrate with CacheUtil instead
                	return Promise.reject('error.invalid.nyi');

                    if (!this.Instance.User.isStaff()) {
                        return Promise.reject('error.invalid.permissions');
                    }
                    else if (isNaN(stageId)) {
                        // invalid arguments
                        return Promise.reject('error.invalid.request');
                    }
                    else {
                        var user = this.Instance.User.currentUser;
                        var selector = { where: { stageId: stageId } };
                        return ActivityScheduleStage.Model.update(values, selector);
                    }
                },

                deleteStage: function(stageId) {
                	// TODO: Integrate with CacheUtil instead
                	return Promise.reject('error.invalid.nyi');

                    if (!this.Instance.User.isStaff()) {
                        return Promise.reject('error.invalid.permissions');
                    }
                    else if (isNaN(stageId)) {
                        // invalid arguments
                        return Promise.reject('error.invalid.request');
                    }
                    else {
                        var user = this.Instance.User.currentUser;
                        var selector = { where: { stageId: stageId } };
                        return ActivityScheduleStage.Model.destroy(selector);
                    }
                },



                // ##################################
                // Permission CUD

                createPermission: function(values) {
                	// TODO: Integrate with CacheUtil instead
                	return Promise.reject('error.invalid.nyi');

                    var stageId;
                    if (!this.Instance.User.isStaff()) {
                        return Promise.reject('error.invalid.permissions');
                    }
                    else if (!values || isNaN(stageId = values.stageId)) {
                        // basic argument verification failed
                        return Promise.reject('error.invalid.request');
                    }
                    else if (!TypeId.isDefined(values.typeId) ||
                        !ActionType.isDefined(values.actionType)) {
                        // advanced argument verification failed
                        return Promise.reject('error.invalid.request');
                    }
                    else {
                        // all arguments seem to check out
                        var user = this.Instance.User.currentUser;
                        var selector = { where: { stageId: stageId } };

                        // perform two queries at once
                        return Promise.join(
                            // make sure, stage exists
                            ActivityScheduleStage.Model.count(selector)
                        )
                        .spread(function(stageCount) {
                            if (!stageCount) {
                                // stage does not exist
                                return Promise.reject('error.invalid.request');
                            }
                            else {
                                // insert permission
                                return ActivityScheduleStageAccessPermission.Model.create(values)
                                .then(function(newPermission) {
                                    if (!newPermission) {
                                        // this should not happen
                                        console.trace('Could not create new permission');
                                        return Promise.reject('error.internal');
                                    }
                                    else {
                                        // new schedule created
                                        return newPermission;
                                    }
                                }.bind(this));
                            }
                        }.bind(this));
                    }
                },

                updatePermission: function(permissionId, expression) {
                	// TODO: Integrate with CacheUtil instead
                	return Promise.reject('error.invalid.nyi');

                    if (!this.Instance.User.isStaff()) {
                        return Promise.reject('error.invalid.permissions');
                    }
                    else if (isNaN(permissionId)) {
                        // invalid arguments
                        return Promise.reject('error.invalid.request');
                    }
                    else {
                        var user = this.Instance.User.currentUser;
                        var selector = { where: { permissionId: permissionId } };
                        var values = {
                            expression: expression
                        };
                        return ActivityScheduleStageAccessPermission.Model.update(values, selector);
                    }
                },

                deletePermission: function(permissionId) {
                	// TODO: Integrate with CacheUtil instead
                	return Promise.reject('error.invalid.nyi');
                	
                    if (!this.Instance.User.isStaff()) {
                        return Promise.reject('error.invalid.permissions');
                    }
                    else if (isNaN(permissionId)) {
                        // invalid arguments
                        return Promise.reject('error.invalid.request');
                    }
                    else {
                        var user = this.Instance.User.currentUser;
                        var selector = { where: { permissionId: permissionId } };
                        return ActivityScheduleStageAccessPermission.Model.destroy(selector);
                    }
                }
            },


            // #################################################################################################
            // Default Schedules


            /** Actions:
             Create
             ViewContent
             EditContent
             EditItemTitle
             Publish
             Unpublish
             RateItem
             ViewOthersItemRatings
             Delete
            */

            /** Permissions:
             IsStudent
             HasGroup
             IsPublished
             GroupOwnsItem
             GroupIsProblemCollaborator
             IsOwnedByProblemOwner
             GroupOwnsProblem
             GroupHasPublishedSolution
            */


            /**
             * Add some pre-defined schedules, if the schedule table is empty.
             */
            _insertDefaultSchedules: function() {
                console.log('Inserting default ActivitySchedules...');

                // Schedule table empty: Create default schedules
                var schedules = [
                {
                    name: 'Default Activity Schedule',
                    description: 'This is the default schedule for learning activities. ' +
                        'If this does not fit your needs, you can derive from and customize it.',
                    stages: [
                    // Write Problems
                    {
                        name: 'Write Own Problem & Solution',

                        // 4 days (see: http://momentjs.com/docs/)
                        stageDuration: moment.duration({d: 4}).asMinutes(),
                        permissions: [
                            // Problem
                            this.buildPermissions(TypeId.Problem, [{
                                actionType: ActionType.Create,
                                expressions: ['HasGroup']
                            },{ 
                                actionType: ActionType.ViewContent,
                                expressions: ['GroupOwnsItem'],
                            },{
                                actionType: ActionType.EditContent,
                                expressions: ['GroupOwnsItem']
                            },{
                                actionType: ActionType.EditItemTitle,
                                expressions: ['GroupOwnsItem']
                            },{
                                actionType: ActionType.Delete,
                                expressions: ['GroupOwnsItem']
                            }]),

                            // Solution
                            this.buildPermissions(TypeId.Solution, [{
                                actionType: ActionType.Create,
                                expressions: ['GroupOwnsProblem']
                            },{ 
                                actionType: ActionType.ViewContent,
                                expressions: ['GroupOwnsItem'],
                            },{
                                actionType: ActionType.EditContent,
                                expressions: ['GroupOwnsItem']
                            },{
                                actionType: ActionType.Delete,
                                expressions: ['GroupOwnsItem']
                            }])
                        ]
                    },

                    // Review Problems
                    {
                        name: 'Review Problems',

                        stageDuration: moment.duration({d: 2}).asMinutes(),
                        permissions: [
                            // Problem
                            this.buildPermissions(TypeId.Problem, [{
                                // still allow creation for those who are late to the party
                                actionType: ActionType.Create,
                                expressions: ['HasGroup']
                            },{
                                // everyone can see published problem statements now
                                actionType: ActionType.ViewContent,
                                expressions: ['GroupIsProblemCollaborator',
                                                'IsPublished + IsStudent'],
                            },{
                                // problem owners and collaborators may edit content
                                actionType: ActionType.EditContent,
                                expressions: ['GroupIsProblemCollaborator']
                            },{
                                // item may still be edited by owner
                                actionType: ActionType.EditItemTitle,
                                expressions: ['GroupOwnsItem']
                            },{
                                // problems may already be published for everyone to see
                                actionType: ActionType.Publish,
                                expressions: ['GroupOwnsItem']
                            },{
                                // problems may still be unpublished
                                actionType: ActionType.Unpublish,
                                expressions: ['GroupOwnsItem']
                            }]),

                            // Solution
                            this.buildPermissions(TypeId.Solution, [{
                                actionType: ActionType.Create,
                                expressions: ['GroupOwnsProblem']
                            },{
                                // problem owners and collaborators may view solution content
                                actionType: ActionType.ViewContent,
                                expressions: ['GroupOwnsItem',
                                                'IsOwnedByProblemOwner + GroupIsProblemCollaborator',
                                                'IsPublished + GroupIsProblemCollaborator']
                            },{
                                // problem owners and collaborators may edit solution content
                                actionType: ActionType.EditContent,
                                expressions: ['GroupOwnsItem',
                                                'IsOwnedByProblemOwner + GroupIsProblemCollaborator']
                            },{
                                actionType: ActionType.Delete,
                                expressions: ['GroupOwnsItem']
                            }])
                        ]
                    },

                    // 
                    {
                        name: 'Solve Problems',
                        description: 'You can now solve other groups\' problems! ' +
                            'Please note that you can still edit your problem statements, but the changes must be small. ' +
                            'If you make big changes to your problem statements, other students who already started writing solutions, might become upset.',

                        stageDuration: moment.duration({d: 6}).asMinutes(),
                        permissions: [
                            // Problem
                            this.buildPermissions(TypeId.Problem, [{
                                actionType: ActionType.ViewContent,
                                expressions: ['GroupIsProblemCollaborator', 
                                                'IsPublished + IsStudent']
                            },{
                                // collaborators may now only make changes if the item has not been published yet
                                actionType: ActionType.EditContent,
                                expressions: ['GroupOwnsItem', 
                                                '!IsPublished + GroupIsProblemCollaborator']
                            },{
                                // problem owner may still publish, but unpublishing is not possible anymore
                                actionType: ActionType.Publish,
                                expressions: ['GroupOwnsItem']
                            }]),

                            // Solution
                            this.buildPermissions(TypeId.Solution, [{
                                // any non-collaborating group may now write solutions
                                actionType: ActionType.Create,
                                expressions: ['GroupOwnsItem', 'HasGroup + !GroupIsProblemCollaborator']
                            },{
                                // problem authors may view own and published solutions
                                actionType: ActionType.ViewContent,
                                expressions: ['GroupOwnsItem',
                                                'IsOwnedByProblemOwner + GroupIsProblemCollaborator',
                                                'IsPublished + GroupIsProblemCollaborator'],
                            },{
                                // problem authors may edit own solutions
                                actionType: ActionType.EditContent,
                                expressions: ['GroupOwnsItem',
                                                'IsOwnedByProblemOwner + GroupIsProblemCollaborator']
                            },{
                                // solutions may be published for problem owners and collaborators to see
                                actionType: ActionType.Publish,
                                expressions: ['GroupOwnsItem']
                            },{
                                // solutions may still be unpublished
                                actionType: ActionType.Unpublish,
                                expressions: ['GroupOwnsItem']
                            },{
                                // solutions may still be deleted
                                actionType: ActionType.Delete,
                                expressions: ['GroupOwnsItem']
                            }])
                        ]
                    },

                    // 
                    {
                        name: 'Grading & Rating',
                        description: '',

                        stageDuration: moment.duration({d: 2}).asMinutes(),
                        permissions: [
                            // Problem
                            this.buildPermissions(TypeId.Problem, [{
                                // Problems may be viewed by authors and solvers, and published problems may be seen by all students
                                actionType: ActionType.ViewContent,
                                expressions: ['GroupIsProblemCollaborator',
                                                'GroupHasPublishedSolution',
                                                'IsPublished'],
                            },{ 
                                actionType: ActionType.RateItem,
                                expressions: ['GroupIsProblemCollaborator',
                                                'GroupHasPublishedSolution'],
                            },{
                                actionType: ActionType.ViewOthersItemRatings,
                                expressions: ['GroupIsProblemCollaborator'],
                            }]),

                            // Solution
                            this.buildPermissions(TypeId.Solution, [{
                                actionType: ActionType.ViewContent,
                                expressions: ['GroupOwnsItem',
                                                'IsOwnedByProblemOwner + GroupIsProblemCollaborator'],
                            },{
                                actionType: ActionType.RateItem,
                                expressions: ['GroupOwnsItem',
                                                'IsOwnedByProblemOwner + GroupIsProblemCollaborator',
                                                'IsPublished + GroupIsProblemCollaborator']
                            },{
                                actionType: ActionType.ViewOthersItemRatings,
                                expressions: ['GroupOwnsItem',
                                                'IsOwnedByProblemOwner + GroupIsProblemCollaborator']
                            },{
                                // solutions may be published for everyone to see
                                actionType: ActionType.Publish,
                                expressions: ['GroupOwnsItem']
                            }])
                        ]
                    },

                    // 
                    {
                        name: 'Activity Ended',
                        description: 'Activity has already ended. You can now look at everything, but not edit anymore.',

                        stageDuration: Shared.ActivitySchedule.InfiniteStageDuration,
                        permissions: [
                            // Problem
                            this.buildPermissions(TypeId.Problem, [{
                                actionType: ActionType.ViewContent,
                                expressions: ['GroupIsProblemCollaborator',
                                                'GroupHasPublishedSolution',
                                                'IsPublished'],
                            },{
                                // owners may edit stuff (why not...)
                                actionType: ActionType.EditContent,
                                expressions: ['GroupOwnsItem'],
                            },{
                                // owners may edit stuff (why not...)
                                actionType: ActionType.EditItemTitle,
                                expressions: ['GroupOwnsItem'],
                            },{
                                // problems may be published for everyone to see
                                actionType: ActionType.Publish,
                                expressions: ['GroupOwnsItem']
                            },{
                                // problems may be unpublished
                                actionType: ActionType.Unpublish,
                                expressions: ['GroupOwnsItem']
                            },{
                                actionType: ActionType.ViewOthersItemRatings,
                                expressions: ['GroupIsProblemCollaborator',
                                                'GroupHasPublishedSolution',
                                                'IsPublished']
                            }]),

                            // Solution
                            this.buildPermissions(TypeId.Solution, [{
                                actionType: ActionType.ViewContent,
                                expressions: ['GroupOwnsItem',
                                                'IsOwnedByProblemOwner + GroupIsProblemCollaborator',
                                                'IsPublished'],
                            },{
                                // owners may still edit stuff (why not...)
                                actionType: ActionType.EditContent,
                                expressions: ['GroupOwnsItem'],
                            },{
                                // owners may still edit stuff (why not...)
                                actionType: ActionType.EditItemTitle,
                                expressions: ['GroupOwnsItem'],
                            },{
                                // solutions may be published for everyone to see
                                actionType: ActionType.Publish,
                                expressions: ['GroupOwnsItem']
                            },{
                                // solutions may be unpublished
                                actionType: ActionType.Unpublish,
                                expressions: ['GroupOwnsItem']
                            },{
                                actionType: ActionType.ViewOthersItemRatings,
                                expressions: ['GroupOwnsItem',
                                                'IsOwnedByProblemOwner + GroupIsProblemCollaborator',
                                                'IsPublished']
                            }])
                        ]
                    }]
                },

                {
                    name: 'Re-grouping Schedule',
                    description: 'This schedule is usually used for a first `Getting Started` activity, ' +
                        'during which students sign into the system and start building their group.\n' +
                        'Alternatively, this can be used for `Re-grouping` activities between other activities ' +
                        'to allow different groups for different activities.\n' +
                        'WARNING: Changing groups during activities is currently a bad idea because the system is not yet able to ' +
                        'track scores accurately in such a scenario.',
                    stages: [{
                        name: 'Build Groups',

                        stageDuration: moment.duration({d: 7}).asMinutes(),
                        mayChangeGroups: 1,
                    }]
                }];
                

                // validate all schedules and interpolate some parameters
                for (var iSchedule = 0; iSchedule < schedules.length; ++iSchedule) {
                    var schedule = schedules[iSchedule];

                    // flatten all permissions (convert nested arrays to one 1D-array)
                    for (var iStage = 0; iStage < schedule.stages.length; iStage++) {
                        var stage = schedule.stages[iStage];
                        stage.stageOrder = stage.stageOrder || iStage+1;
                        stage.permissions = _.flatten(stage.permissions);
                    };

                    schedule.order = iSchedule;     // set order
                    this.validateSchedule(schedule);
                };


                // sequentially add schedules
                var promise = Promise.resolve();
                for (var i = 0; i < schedules.length; ++i) {
                    var schedule = schedules[i];

                    promise = promise
                    .return(schedule)
                    .then(this.insertSchedule.bind(this));
                };

                return promise
                .catch(function(err) {
                    return Promise.reject(new Error('Failed to create default ActivitySchedules - ' + 
                        SequelizeUtil.errToString(err)));
                });
            },
        };
    }),



    // #################################################################################################
    // Client

    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;
        return {
            __ctor: function () {
                ThisComponent = this;
            },


            // #################################################################################################
            // Client-side cache organization

            cacheEventHandlers: {
                schedules: {
                    updated: function(newValues, queryData, schedulesCache) {
                        // interpolate some data
                        ThisComponent._fixSchedules(schedulesCache.list);
                    }
                }
            },

            /**
             * Interpolate some more suitable and usable schedule information.
             * E.g. sort permissions into buckets by TypeId and ActionType.
             */
            _fixSchedules: function(schedules) {
                for (var iSchedule = 0; iSchedule < schedules.length; ++iSchedule) {
                    var schedule = schedules[iSchedule];
                    var stages = schedule.stages;

                    if (stages) {
                        for (var iStage = 0; iStage < stages.length; ++iStage) {
                            var stage = stages[iStage];
                            
                            // create array of TypeIds, containing maps of ActionType -> Permission
                            stage._permissionsByItemAction = {};

                            var permissions = stage.permissions;
                            var typeNames = Instance.WorkItems.WorkItemTypes;
                            for (var i = 0; i < typeNames.length; ++i) {
                                var typeName = typeNames[i];
                                var typeId = Instance.ObjectTypes.TypeId[typeName];
                                stage._permissionsByItemAction[typeId] = {};
                            }
                            if (permissions) {
                                // add all permissions to sorted arrays
                                for (var iPermission = 0; iPermission < permissions.length; ++iPermission) {
                                    var permission = permissions[iPermission];
                                    var permissionsOfTypeId = stage._permissionsByItemAction[permission.typeId];
                                    if (!permissionsOfTypeId) {
                                        console.warn('Invalid TypeId in Permission: ' + permission.typeId);
                                        continue;
                                    }
                                    var permissionList = permissionsOfTypeId[permission.actionType];
                                    if (!permissionList) {
                                        permissionList = permissionsOfTypeId[permission.actionType] = [];
                                    }
                                    permissionList.push(permission);
                                };
                            }
                        };
                    }
                };
            }
        };
    })
});