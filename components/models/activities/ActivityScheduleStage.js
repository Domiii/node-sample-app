/**
 * ActivityScheduleStage defines a time window for activity scheduling 
 * and its access permissions.
 * 
 */
"use strict";

var componentsRoot = '../../';
var libRoot = componentsRoot + '../lib/';

var NoGapDef = require('nogap').Def;

var SequelizeUtil = require(libRoot + 'SequelizeUtil');


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
            initBase: function() {
            },

            Private: {
            }
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var ActivityScheduleStageModel;
        var ActivitySchedule;

        return {
            __ctor: function () {
            },

            initModel: function() {
                ActivitySchedule = Shared.ActivitySchedule;

                /**
                 * ActivityScheduleStage model definition
                 */
                return ActivityScheduleStageModel = sequelize.define('ActivityScheduleStage', {
                    stageId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                    scheduleId: {type: Sequelize.INTEGER.UNSIGNED},
                    name: Sequelize.STRING(100),
                    description: Sequelize.TEXT,

                    // determines the order of stages for the owning schedule
                    stageOrder: {type: Sequelize.INTEGER.UNSIGNED},

                    /**
                     * Duration in minutes
                     */
                    stageDuration: {type: Sequelize.INTEGER.UNSIGNED},

                    // group settings during this stage
                    mayChangeGroups: {type: Sequelize.INTEGER.UNSIGNED},
                },{
                    freezeTableName: true,
                    tableName: 'bjt_activity_schedule_stage',
                    classMethods: {
                        onBeforeSync: function(models) {
                        },

                        onAfterSync: function(models) {
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists('bjt_activity_schedule_stage', ['stageId']),
                                SequelizeUtil.createIndexIfNotExists('bjt_activity_schedule_stage', ['scheduleId']),
                                SequelizeUtil.createIndexIfNotExists('bjt_activity_schedule_stage', ['name'])
                            );
                        }
                    }
                });
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
            },
        };
    }),

    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {
            __ctor: function () {
            },

            Public: {
            }
        };
    })
});