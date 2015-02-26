/**
 * An Activity contains and manages WorkItems and their work flow.
 * 
 */
"use strict";


var NoGapDef = require('nogap').Def;

// TODO: Allow toggling display of inactive activities
// TODO: Show activity + current stage on ProblemPage
// TODO: Test permission handling

module.exports = NoGapDef.component({
Includes: [
    'ActivitySchedule',
    'ActivityScheduleStage',
    'ActivityScheduleStageAccessPermission',

    'ActivityCollaboration'
],

Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) { return {
    initBase: function() {
    },

    Private: {
        // Caches
        Caches: {
            activities: {
                idProperty: 'activityId',

                hasHostMemorySet: 1,

                /**
                 * The Activity instance prototype provides utilities to deal with
                 * scheduling and more.
                 */
                InstanceProto: {
                    // methods

                    initialize: function() {
                    },

                    canArchive: function() {
                        return !this.isArchived && this.hasEnded();
                    },


                    // ########################################################
                    // Activity schedule and stages

                    getSchedule: function() {
                        var schedule = this.schedule;
                        if (!schedule && this.scheduleId && Shared.ActivitySchedule.schedules) {
                            schedule = Shared.ActivitySchedule.schedules.getObjectNow(this.scheduleId);
                        }
                        return schedule;
                    },

                    isActive: function(_atTime) {
                        return this.hasStarted() && !this.hasEnded();
                    },

                    hasStarted: function(_atTime) {
                        var atTime = moment(_atTime);
                        var startTime = moment(this.startTime);
                        return atTime.isAfter(startTime);
                    },

                    hasEnded: function(_atTime) {
                        var atTime = moment(_atTime);
                        var endTime = this.getEndTime();
                        return !!endTime && atTime.isAfter(endTime);
                    },

                    /**
                     * Get total schedule duration, in minutes.
                     * Returns -1, if duration cannot be queried.
                     */
                    getScheduleDurationMinutes: function() {
                        var schedule = this.getSchedule();
                        if (!schedule || !schedule.stages) return -1;

                        var duration = 0;
                        for (var i = 0; i < schedule.stages.length; ++i) {
                            var stage = schedule.stages[i];
                            var minutes = stage.stageDuration;
                            if (minutes != Shared.ActivitySchedule.InfiniteStageDuration) {
                                duration += minutes;
                            }
                        };

                        return duration;
                    },

                    getStartTime: function() {
                        return moment(this.startTime);
                    },

                    /**
                     * @return startTime + getScheduleDuration(), or null if data is inconsistent
                     */
                    getEndTime: function() {
                        var minutes = this.getScheduleDurationMinutes();
                        if (minutes < 0) return null;

                        if (!this.startTime) return null;
                        return moment(this.startTime).add(minutes, 'minutes');
                    },

                    /**
                     * A never-ending stage is the final stage, or the "steady state",
                     * of an activity.
                     */
                    isStageVisible: function(stage) {
                        return stage.stageDuration < Shared.ActivitySchedule.InfiniteStageDuration;
                    },

                    getStageIndex: function(_time) {
                        var schedule = this.getSchedule();
                        if (!schedule || !schedule.stages) return -1;
                        
                        var time = moment(_time);
                        var stageTime = moment(this.startTime);
                        if (stageTime.isAfter(time)) {
                            // activity has not started yet
                            return -1;
                        }

                        // TODO: Make sure, stages are always in the right order anyway
                        //schedule.stages = _.sortBy(schedule.stages, 'stageOrder');

                        for (var i = 0; i < schedule.stages.length; ++i) {
                            var stage = schedule.stages[i];
                            var minutes = stage.stageDuration;
                            if (minutes) stageTime.add(minutes, 'minutes');
                            if (stageTime.isAfter(time)) {
                                // `time` is in between previous and current `stageTime`
                                return i;
                            }
                        };

                        // this activity is not active anymore
                        return -1;
                    },

                    /**
                     * Returns the stage that is active during the given time.
                     *
                     * @time If no time is provided, the current time is used.
                     */
                    getStage: function(time) {
                        var stageIndex = this.getStageIndex(time);
                        if (stageIndex < 0) return null;
                        return this.getSchedule().stages[stageIndex];
                    },

                    getCurrentStage: function() {
                        return this.getStage();
                    },

                    getNextStage: function(time) {
                        // check if there is a next stage
                        if (this.hasEnded()) {
                            return null;
                        }

                        var schedule = this.getSchedule();
                        if (!schedule) return null;

                        if (!this.hasStarted()) {
                            // go to first stage
                            return this.getFirstStage();
                        }

                        // get index of stage at given time
                        var stageIndex = this.getStageIndex(time);
                        if (stageIndex < 0 || stageIndex >= schedule.stages.length-1) return null;

                        return schedule.stages[stageIndex+1];
                    },

                    getPreviousStage: function(time) {
                        // check if there is a previous stage
                        if (!this.hasStarted()) return null;

                        var schedule = this.getSchedule();
                        if (!schedule) return null;

                        if (this.hasEnded()) {
                            // go to last stage
                            return this.getLastStage();
                        }

                        // get index of stage at given time
                        var stageIndex = this.getStageIndex(time);
                        if (stageIndex < 1) return null;

                        return schedule.stages[stageIndex-1];
                    },

                    getFirstStage: function() {
                        var schedule = this.getSchedule();
                        if (!schedule) return null;

                        return _.first(schedule.stages);
                    },

                    getLastStage: function() {
                        var schedule = this.getSchedule();
                        if (!schedule) return null;

                        var idx = _.findLastIndex(schedule.stages, function(stage) { 
                            return stage.stageDuration != Shared.ActivitySchedule.InfiniteStageDuration; 
                        });
                        return schedule.stages[idx];
                    },

                    getStageStartTime: function(stage) {
                        var schedule = this.getSchedule();
                        if (!schedule || !schedule.stages) return null;

                        if (!stage) {
                            // get current stage
                            stage = this.getStage();
                        }
                        // start counting
                        var stageTime = moment(this.startTime);

                        for (var i = 0; i < schedule.stages.length; ++i) {
                            var otherStage = schedule.stages[i];
                            var minutes = otherStage.stageDuration;
                            if (stage === otherStage) {
                                // end time of current stage
                                return stageTime;
                            }
                            if (minutes) stageTime.add(minutes, 'minutes');
                        };

                        // this activity is not active anymore
                        return null;
                    },

                    getStageEndTime: function(stage) {
                        var schedule = this.schedule;
                        if (!schedule && this.scheduleId && Shared.ActivitySchedule.schedules) {
                            schedule = Shared.ActivitySchedule.schedules.getObjectNow(this.scheduleId);
                        }
                        if (!schedule || !schedule.stages) return null;

                        if (!stage) {
                            // get current stage
                            stage = this.getStage();
                        }
                        // start counting
                        var stageTime = moment(this.startTime);

                        for (var i = 0; i < schedule.stages.length; ++i) {
                            var otherStage = schedule.stages[i];
                            var minutes = otherStage.stageDuration;
                            if (minutes) stageTime.add(minutes, 'minutes');
                            if (stage === otherStage) {
                                // end time of current stage
                                return stageTime;
                            }
                        };

                        // this activity is not active anymore
                        return null;
                    },

                    fixStartTime: function(_startTime) {
                        var startTime = new Date(_startTime);
                        
                        // convert to UTC (correct for timezone)
                        // see: http://stackoverflow.com/questions/13315325/ignoring-timezones-when-creating-a-date-in-javascript-momentjs
                        return new Date(startTime.getUTCFullYear(), 
                            startTime.getUTCMonth(),
                            startTime.getUTCDate(),
                            startTime.getUTCHours(),

                            // correct for timezone (which is in minutes)
                            // see http://www.w3schools.com/jsref/jsref_gettimezoneoffset.asp
                            startTime.getUTCMinutes() - startTime.getTimezoneOffset(),
                            startTime.getUTCSeconds(),
                            startTime.getUTCMilliseconds(),
                            0);
                    },

                    setStartTime: function(_startTime) {
                        return this.startTime = this.fixStartTime(_startTime);
                    },

                    setCurrentStage: function(stage) {
                        var schedule = this.getSchedule();
                        if (!schedule) return;

                        // calculate how long startTime should be from now
                        var minutesToStage = 0;
                        if (stage) {
                            for (var i = 0; i < schedule.stages.length; ++i) {
                                var otherStage = schedule.stages[i];
                                if (otherStage !== stage) {
                                    minutesToStage += otherStage.stageDuration;
                                }
                                else { break; }
                            };
                        }

                        var nowMillis = new Date();
                        var offsetSeconds = 0;
                        //var offsetSeconds = 5;
                        var millisToStage = minutesToStage * 60 * 1000 - (offsetSeconds * 1000);

                        // update startTime
                        var oldStartTime = this.startTime;
                        var newStartTime = new Date(nowMillis - millisToStage);
                        this.setStartTime(newStartTime);
                        return newStartTime;
                    },


                    // ########################################################
                    // Activity collaboration

                    /** 
                     * Set of gids of all groups collaborating with the given owner group.
                     */
                    getCollaborators: function(ownerGid) {
                        var collaborations = _.where(this.collaborations, { 'ownerGid': ownerGid });
                        return _.pluck(collaborations, 'collaboratorGid');
                    },

                    /**
                     * Set of gids of all author groups who the given group collaborates with.
                     */
                    getCollaboratingAuthors: function(collaboratorGid) {
                        var collaborations = _.where(this.collaborations, { 'collaboratorGid': collaboratorGid });
                        return _.pluck(collaborations, 'ownerGid');
                    }
                },

                members: {
                    getObjectNow: function(queryInput) {
                        if (!this.hasMemorySet()) return null;                 // no in-memory set

                        if (!queryInput || (isNaN(queryInput) && isNaN(queryInput.activityId))) {
                            return null;
                        }
                        return this.byId[queryInput.activityId || queryInput];     // look up by id
                    },

                	compileReadObjectQuery: function(queryInput) {
                        if (!queryInput || (isNaN(queryInput) && isNaN(queryInput.activityId))) {
                            return Promise.reject('error.invalid.request');
                        }

                        // query from DB
                        var queryData = {
                            include: Shared.Activity.activityAssociations,
                            order: Shared.Activity.activityOrder,
                            where: {
                                activityId: queryInput.activityId || queryInput
                            }
                        };

                        if (!this.Instance.User.isStaff()) {
                            // students may only see enabled activities
                            queryData.where.isEnabled = 1;
                        }

                        return queryData;
                	},

                	getObjectsNow: function(queryInput) {
                        if (!this.hasMemorySet()) return null;                 // no in-memory set

                        // TODO: There is no guarantee, the currently matching in-memory set is the complete set
                        return null;
                  //       if (queryInput && 
                  //               !(queryInput instanceof Array) &&
                  //               !(queryInput.activityIds instanceof Array)) {
                  //           // either, we don't want any query input, or we want an array of ids
                  //           return null;
                  //       }

                		// var where;
                  //       var activityIds = queryInput && (queryInput instanceof Array && queryInput || queryInput.activityIds);
                  //       if (activityIds) {
                  //       	if (activityIds.length != 1) {
                  //       		// we are not handling this complex case here
                  //       		return null;
                  //       	}

                  //           where = where || {};
                  //           where.activityId = activityIds[0];
                  //       }

                  //       if (!this.Instance.User.isStaff()) {
                  //           // students may only see enabled activities
                  //           where = where || {};
                  //           where.isEnabled = 1;
                  //       }

                  //       if (where) {
                  //       	return _.where(this.list, where);
                  //       }
                  //       else {
	                 //        // return all activities
	                 //        return this.list;
	                 //    }
                	},

                    compileReadObjectsQuery: function(queryInput) {
                        if (queryInput && 
                                !(queryInput instanceof Array) &&
                                !(queryInput.activityIds instanceof Array)) {
                            // either, we don't want any query restrictions, or we want an array of ids
                            return Promise.reject('error.invalid.request');
                        }

                        // query from DB
                        var queryData = {
                            include: Shared.Activity.activityAssociations,
                            order: Shared.Activity.activityOrder,
                            where: {}
                        };

                        if (queryInput) {
                            var activityIds = queryInput instanceof Array ? 
                                queryInput : 
                                queryInput.activityIds;
                            queryData.where.activityId = activityIds;
                        }

                        if (!this.Instance.User.isStaff()) {
                            // students may only see enabled activities
                            queryData.where.isEnabled = 1;
                        }

                        return queryData;
                    },

                    onCreateObject: function(activity) {
                        // assign collaborators
                        return this.Instance.Activity.assignCollaborators(activity)
                        .then(function() {
                            // finally, return activity
                            return activity;
                        });
                    },

                    // /**
                    //  * Called when an Activity has been queried from DB on Host.
                    //  */
                    // onReadObject: function(activity) {
                    //     if (!activity) {
                    //         // invalid id
                    //         return Promise.reject('error.invalid.request');
                    //     }
                    //     else {
                    //         return this._filterActivityData(activity);
                    //     }
                    // },

                    // /**
                    //  * Called when Activities have been queried from DB on Host.
                    //  */
                    // onReadObjects: function(activities) {
                    //     if (activities && activities.length) {
                    //         for (var i = 0; i < activities.length; ++i) {
                    //             var activity = activities[i];
                    //         };
                    //     }
                    // },

                    // _filterActivityData: function(activity) {
                    // }
                }
            } // activities
        }, // Caches


        // ###########################################################################################
        // Utilities

        /**
         * Determine if activity or only activityId is given.
         * Fetch activity from DB or cache, if only id is given.
         */
        resolveActivity: function(activityOrId) {
            if (!activityOrId) {
                // invalid activity query
                console.error('Tried to call `resolveActivity` without `activityOrId` set.');
                return Promise.reject('error.invalid.request');
            }
            else if (activityOrId.activityId) {
                // activity was given
                var activity = activityOrId;
                if (activity.schedule || !activity.scheduleId) {
                    // schedule was already fetched, or activity has no schedule
                    return activity;
                }
                else {
                    // need to fetch schedule separately
                    return this.Instance.ActivitySchedule.schedules.getObject(activity.scheduleId)
                    .then(function(schedule) {
                        activity.schedule = schedule;
                        return activity;        // return activity
                    });
                }
            }
            else {
                // only activityId was given -> fetch activity from DB or cache
                var query = {
                    activityId: activityOrId
                };

                return this.Instance.Activity.activities.getObject(query);
            }
        },
    } // Private
}; }),


Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
    var ItemRatingCategory,
        ItemRating,
        ItemRatingFeedback,

        ActivitySchedule,
        ActivityScheduleStage,
        ActivityScheduleStageAccessPermission,

        ActivityModel;

    var SequelizeUtil,
        TokenStore;

    // Random Number Generator for collaboration associations
    var collaborationRNG;

    return {
        __ctor: function () {
            var appRoot = '../../../';
            var libRoot = appRoot + 'lib/';

            SequelizeUtil = require(libRoot + 'SequelizeUtil');
            TokenStore = require(libRoot + 'TokenStore');

            /**
             * @see http://davidbau.com/archives/2010/01/30/random_seeds_coded_hints_and_quintillions.html#more
             */
            var seedrandom = require(appRoot + 'pub/lib/Math.seedrandom');
            var collaborationSeed = TokenStore.getToken('collaborationSeed');
            collaborationRNG = seedrandom(collaborationSeed);

        },

        initHost: function() {
            ItemRating = Shared.ItemRating;
            ItemRatingCategory = Shared.ItemRatingCategory;
            ItemRatingFeedback = Shared.ItemRatingFeedback;

            ActivitySchedule = Shared.ActivitySchedule;
            ActivityScheduleStage = Shared.ActivityScheduleStage;
            ActivityScheduleStageAccessPermission = Shared.ActivityScheduleStageAccessPermission;
        },

        initModel: function() {
            var This = this;

            /**
             * Activity model definition.
             */
            return ActivityModel = sequelize.define('Activity', {
                // columns
                activityId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                name: Sequelize.STRING(100),
                description: Sequelize.TEXT,

                /**
                 * When this activity started.
                 */
                startTime: {type: Sequelize.DATE},

                /**
                 * Id of the currently used schedule for this activity.
                 */
                scheduleId: {type: Sequelize.INTEGER.UNSIGNED},

                /**
                 * Students can only see and part-take in enabled activities.
                 */
                isEnabled: {type: Sequelize.INTEGER.UNSIGNED},

                /**
                 * The highest priority value is that of the by-default selected activity.
                 */
                priority: {type: Sequelize.INTEGER.UNSIGNED},

                /**
                 * When archiving (after an activity finished), all scores will be computed and handed out.
                 * This can only happen once.
                 */
                isArchived: {type: Sequelize.INTEGER.UNSIGNED},
            },{
                // other

                freezeTableName: true,
                tableName: 'bjt_activity',
                classMethods: {
                    onBeforeSync: function(models) {
                        // Official model associations

                        // activity + schedule associations
                        models.Activity.belongsTo(models.ActivitySchedule, 
                            { foreignKey: 'scheduleId', as: 'schedule', constraints: false });
                        models.ActivitySchedule.hasMany(models.Activity,
                            { foreignKey: 'scheduleId', as: 'activities', constraints: false});
                        models.ActivityScheduleStage.belongsTo(models.ActivitySchedule, 
                            { foreignKey: 'scheduleId', as: 'schedule', foreignKeyConstraint: true, 
                                onDelete: 'cascade', onUpdate: 'cascade' });
                        models.ActivitySchedule.hasMany(models.ActivityScheduleStage,
                            { foreignKey: 'scheduleId', as: 'stages', constraints: false });
                        models.ActivityScheduleStageAccessPermission.belongsTo(models.ActivityScheduleStage,
                            { foreignKey: 'stageId', as: 'stage', foreignKeyConstraint: true, 
                                onDelete: 'cascade', onUpdate: 'cascade' });
                        models.ActivityScheduleStage.hasMany(models.ActivityScheduleStageAccessPermission,
                            { foreignKey: 'stageId', as: 'permissions', constraints: false });

                        // activity + ratings associations
                        models.ItemRating.belongsTo(models.ItemRatingCategory,
                            { foreignKey: 'categoryId', as: 'category', foreignKeyConstraint: true,
                            onDelete: 'cascade', onUpdate: 'cascade' });
                        models.ItemRatingCategory.hasMany(models.ItemRating,
                            { foreignKey: 'categoryId', as: 'ratings', constraints: false });

                        // activity + collaboration associations
                        models.ActivityCollaboration.belongsTo(models.Activity, 
                            { foreignKey: 'activityId', as: 'activity', foreignKeyConstraint: true });
                        models.Activity.hasMany(models.ActivityCollaboration,
                            { foreignKey: 'activityId', as: 'collaborations', constraints: false });


                        // Prep common associations and other repeated stuff for our DB queries

                        // special order for schedules + stages 
                        This.activityScheduleOrder = [
                            ['order'],
                            [{ model: models.ActivityScheduleStage, as: 'stages' }, 'stageOrder']
                        ];

                        // when fetching stages, include their access list
                        This.activityScheduleStageAssociations = [{
                            model: models.ActivityScheduleStageAccessPermission,
                            as: 'permissions',
                        }];

                        // when fetching schedules, include their stages
                        This.activityScheduleAssociations = [{
                            model: models.ActivityScheduleStage,
                            as: 'stages',
                            include: This.activityScheduleStageAssociations,
                            order: [['stageOrder']]
                        }];

                        // order activities and their included data
                        This.activityOrder = [
                            ['startTime'],
                            [{ model: models.ActivitySchedule, as: 'schedule' }, 'scheduleId'],
                            [   
                                { model: models.ActivitySchedule, as: 'schedule' }, 
                                { model: models.ActivityScheduleStage, as: 'stages' }, 'stageOrder'
                            ]
                        ];

                        // when fetching activities, include their schedule and the schedule's stages
                        This.activityAssociations = [{
                            model: models.ActivitySchedule,
                            as: 'schedule',
                            include: This.activityScheduleAssociations,

                            // order schedules, as well as stages
                            order: [['scheduleId']]
                            //order: Shared.Activity.activityScheduleOrder
                        },
                        {
                            model: models.ActivityCollaboration,
                            as: 'collaborations'
                        }];
                    },

                    onAfterSync: function(models) {
                        return Promise.join(
                            SequelizeUtil.createIndexIfNotExists('bjt_activity', ['activityId']),
                            SequelizeUtil.createIndexIfNotExists('bjt_activity', ['name'])
                        );
                    }
                }   // classMethods
            }); // define
        },


        Private: {
            __ctor: function () {
                this.events = {
                };
            },

            onNewClient: function() {
            },

            onClientBootstrap: function() {
            },


            // ###########################################################################################
            // Collaborations

            /**
             * Use pseudo random number generator for shuffling, and then shift
             */
            assignCollaborators: function(activity) {
                // shuffle all groups
                // Add shift for every past activity
                var nMaxCollaborations = Shared.AppConfig.getValue('nCollaboratorsPerActivity');
                var _debugCounts = {};

                /**
                 * @see http://stackoverflow.com/questions/17445231/js-how-to-find-the-greatest-common-divisor
                 */
                function gcd(a,b) {
                    if (a < 0) a = -a;
                    if (b < 0) b = -b;
                    if (b > a) {var temp = a; a = b; b = temp;}
                    while (true) {
                        a %= b;
                        if (a == 0) return b;
                        b %= a;
                        if (b == 0) return a;
                    }
                }

                return Promise.join(
                    this.Instance.Group.groups.getObjects()
                )
                .bind(this)
                .spread(function(groups) {
                    if (groups.length <= (1+nMaxCollaborations) * (1+nMaxCollaborations) + 1) {
                        console.error('Tried to assign collaborators for activity `' + activity.name + '` ' +
                            'while there are not enough groups (' + groups.length + ').');
                        return;
                    }

                    var collaborationsCache = this.Instance.ActivityCollaboration.collaborations;
                    var nCollaborations = Math.min(groups.length - 1, nMaxCollaborations);

                    // always shuffle the same way
                    squishy.shuffleArray(groups, collaborationRNG);

                    // then shift by the amount of previous collaborators
                    //      (approximated by: nCollaborations * activityId)
                    var nShift = Math.max(1, activity.activityId) * nCollaborations;

                    // make sure to find a shit s.t. gcd(nShift, groups.length) == 1
                    //      to ensure iCollaborator (below) to be unique in every iteration
                    while (gcd(nShift, groups.length) > 1) {
                        nShift += 1;
                    };

                    var _collaborations = [];
                    for (var iOwner = 0; iOwner < groups.length; ++iOwner) {
                        var owner = groups[iOwner];

                        for (var iCollaboration = 0; iCollaboration < Math.min(nCollaborations, groups.length); ++iCollaboration) {
                            var iCollaborator = 1 + iOwner + nShift * iCollaboration;
                            iCollaborator = iCollaborator % groups.length;

                            //_debugCounts[iCollaborator] = (_debugCounts[iCollaborator] || 0) + 1;

                            // don't let the snake bite it's own tail:
                            if (iCollaborator == iOwner) {
                                continue;
                                ++nCollaborations;
                            }

                            var collaborator = groups[iCollaborator];

                            var newCollaboration = {
                                activityId: activity.activityId,
                                ownerGid: owner.gid,
                                collaboratorGid: collaborator.gid
                            };
                            var creation = collaborationsCache.createObject(newCollaboration);
                            _collaborations.push(creation);
                        }
                    }

                    return Promise.all(_collaborations)
                    .then(function(newCollaborations) {
                        activity.collaborations = newCollaborations;
                    });
                });
            },


            // ###########################################################################################
            // Score computation

            // TODO: Compute problem score for each collaborator
            // TODO: What if no one voted?

            /**
             * Computes score and adds new query entry to given `scoreQueries` array
             */
            _createSolutionScoreEntry: function(ratingCategories, allSolutionsTotalByRatingCategory, item, name, scoreQueries) {
                var computeSolutionScore = function(totalProblemScorePoints, allSolutionsTotal, ownSolutionValue) {
                    var ownWeight = ownSolutionValue > 0 ? ownSolutionValue / allSolutionsTotal : 0;
                    return totalProblemScorePoints * ownWeight;
                };

                // TODO: OMG

                var solutionRatings = item.ratings;
                var totalSolutionScore = 0;

                // sum up the pieces of each ratingCategory's pie
                for (var iRatingCategory = 0; iRatingCategory < ratingCategories.length; ++iRatingCategory) {
                    var ratingCategory = ratingCategories[iRatingCategory];
                    var ratingCategoryId = ratingCategory.categoryId;
                    var ownSolutionValue = solutionRatings.total[ratingCategoryId] || 0;
                    var allSolutionsTotal = allSolutionsTotalByRatingCategory[ratingCategoryId] || 0;

                    var solutionScore = computeSolutionScore(ratingCategory.totalScore, allSolutionsTotal, ownSolutionValue);
                    totalSolutionScore += solutionScore;
                }

                // insert new score into DB
                var sourceCategory = Shared.ScoreSourceCategory.Categories.byName['Solution'];
                var newScore = {
                    gid: item.gid,
                    sourceCategoryId: sourceCategory.sourceCategoryId,
                    sourceActivityId: item.activityId,
                    sourceItemId: item.itemId,
                    sourceUid: null,
                    sourceGid: null,

                    value: Math.ceil(totalSolutionScore),
                    sourceName: name,
                };

                return this.Instance.ScoreEntry.scoreEntries.createObject(newScore);
            },

            /**
             * Delete all existing and then (re-)compute and assign scores for all activity problems and solutions
             */
            archiveActivity: function(activityOrId) {
                var ratingCategoriesCache = this.Instance.ItemRatingCategory.ratingCategories;
                var ratingsCache = this.Instance.ItemRating.ratings;
                var problemCache = this.Instance.WorkItems.getCache(Shared.ObjectTypes.TypeId.Problem);

                var activityId = activityOrId && activityOrId.activityId || activityOrId;
                if (isNaN(activityId)) {
                    return Promise.reject('error.invalid.request');
                }

                return Promise.join(
                    // get activity
                    this.resolveActivity(activityOrId),

                    // get all users
                    //this.Instance.User.users.readObjects(),

                    // get all groups
                    //this.Instance.Group.groups.readObjects(),

                    // get all RatingCategories
                    ratingCategoriesCache.readObjects(),

                    // get *all* (not just some) ratings
                    ratingsCache.findObjects(),

                    // get all problems and solutions
                    problemCache.readObjects({activityId: activityId}),



                    // delete all existing scores
                    Shared.ScoreEntry.Model.destroy({where: { sourceActivityId: activityId }})
                )
                .bind(this)
                .spread(function(activity, /*users,*/ /*groups,*/ ratingCategories, ratings, problemsAndSolutions) {
                    var scoreQueries = [];
                    //var usersById = _.indexBy(users, 'uid');
                    //var groupsById = _.indexBy(groups, 'gid');
                    var ratingCategoriesById = _.indexBy(ratingCategories, 'categoryId');

                    for (var iProblem = 0; iProblem < problemsAndSolutions.length; ++iProblem) {
                        var problem = problemsAndSolutions[iProblem];
                        var problemRatings = problem.getRatings();

                        var collaborators = activity.getCollaborators(problem.gid);
                        problemRatings.computeItemRatingStats(collaborators);

                        // 1a. compute total solution scores per ratingCategory (allSolutionsTotalByRatingCategory)
                        var allSolutionsTotalByRatingCategory = {};
                        for (var iSolution = 0; iSolution < problem.solutions.length; ++iSolution) {
                            var solution = problem.solutions[iSolution];
                            var solutionRatings = solution.getRatings();
                            solutionRatings.computeItemRatingStats();

                            if (solution.gid == problem.gid) continue;

                            for (var iRatingCategory = 0; iRatingCategory < ratingCategories; ++iRatingCategory) {
                                var ratingCategory = ratingCategories[iRatingCategory];
                                var ratingCategoryId = ratingCategory.categoryId;
                                var solutionRatingCategoryTotal = solutionRatings.total[ratingCategoryId] || 0;
                                var problemTotal = allSolutionsTotalByRatingCategory[ratingCategoryId] || 0;
                                allSolutionsTotalByRatingCategory[ratingCategoryId] = problemTotal + solutionRatingCategoryTotal;
                            }
                        }

                        // 1b. compute each solution's share of total problem score pie and insert into DB
                        for (var iSolution = 0; iSolution < problem.solutions.length; ++iSolution) {
                            var solution = problem.solutions[iSolution];
                            if (solution.gid == problem.gid) continue;

                            this._createSolutionScoreEntry(ratingCategories, allSolutionsTotalByRatingCategory, solution, problem.name, scoreQueries);
                        }


                        // 2. compute each problem collaborator's share and insert into DB

                    }

                    // finish -> Wait for all creates to finish
                    return Promise.all(scoreQueries);
                })
                .then(function() {
                    // finally archive the activity!
                    return this.activities.updateObject({
                        activityId: activityId,
                        isArchived: 1
                    });
                });
            },

            // /**
            //  * TODO: Add this to cache system
            //  * Get all activities visible for the current user.
            //  * where `itemCounts` is a map of maps of counts, 
            //  * first indexed by TypeId and then by activityId.
            //  */
            // getAllActivities: function(countItemCategories) {
            //     // do two things at once:
            //     var chainer = new Sequelize.Utils.QueryChainer()

            //     // get all activities
            //     .add(this.Shared.Model.findAll(queryData));

            //     if (countItemCategories) {
            //         // also count all rows belonging to each activity
            //         // see: https://github.com/sequelize/sequelize/blob/master/lib/model.js#L847
            //         for (var iCategory = 0; iCategory < countItemCategories.length; ++iCategory) {
            //             var category = countItemCategories[iCategory];
            //             var model = category.getModel();
            //             chainer.add(SequelizeUtil.countGroups(model, 'activityId'))
            //         };
            //     }

            //     // run all queries in parallel
            //     chainer.run().complete(function(err, results) {
            //         if (err) {
            //             return Promise.reject(SequelizeUtil.errToString(err));
            //         }
            //         else {
            //             // get activity values
            //             var activities = SequelizeUtil.getValuesFromRows(results[0], this.activityAssociations);

            //             // map all activities by id
            //             var activitiesMap = this.createActivityMap(activities);

            //             // get all counts
            //             var allItemCounts = {};
            //             if (countItemCategories) {
            //                 var countsByActivityId;

            //                 // iterate over all item type counts
            //                 for (var iResult = 1; iResult < results.length; ++iResult) {
            //                     var result = results[iResult];
            //                     var category = countItemCategories[iResult-1];
            //                     allItemCounts[category.typeId] = countsByActivityId = {};

            //                     // iterate over all distinct activity ids
            //                     for (var iActivity = 0; iActivity < result.length; ++iActivity) {
            //                         var countData = result[iActivity].dataValues;
            //                         var activityId = countData.activityId;
            //                         if (activitiesMap[activityId]) {
            //                             // only add the count, if activity is visible to user
            //                             countsByActivityId[activityId] = countData.cnt;
            //                         }
            //                     }
            //                 };
            //             }
            //             return {activities, allItemCounts};
            //         }
            //     }.bind(this));
            // },
        },

        Public: {
            archiveActivityPublic: function(activityId) {
                if (!this.Instance.User.isStaff()) {
                    return Promise.reject('error.invalid.permissions');
                }
                return this.archiveActivity(activityId);
            }
        },
    };
}),



Client: NoGapDef.defClient(function(Tools, Instance, Context) {
    return {
        __ctor: function () {
            // error is set if activity query failed
            this.lastError;

            this.itemCounts;
        },

        events: {
        },


        // ###########################################################################################
        // Client-side Activity cache

        getCachedActivity: function(activityId) {
            return this.activities.getObjectNowById(activityId);
        },

        getItemCounts: function(typeId) {
            return itemCounts ? itemCounts[typeId] : null;
        },

        getItemCount: function(typeId, activityId) {
            var countsByActivityId = getItemCounts[typeId];
            return (countsByActivityId && countsByActivityId[activityId]) || 0;
        },


        Public: {
        }
    };
})      // Client
});