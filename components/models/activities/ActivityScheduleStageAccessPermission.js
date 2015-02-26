/**
 * A set of access permissions make up an access list.
 * All permissions need to be met for the access list to allow access to anyone.
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
        var ActivityScheduleStage,
            ActivityScheduleStageAccessPermissionModel;

        return {
            __ctor: function () {
            },


            // #########################################################################################################
            // Initialization & Setup

            initModel: function() {
                /**
                 * ActivityScheduleStageAccessPermission model definition
                 */
                return ActivityScheduleStageAccessPermissionModel = sequelize.define('ActivityScheduleStageAccessPermission', {
                    permissionId: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
                    /**
                     * A stage has many access lists.
                     */
                    stageId: {type: Sequelize.INTEGER.UNSIGNED},

                    /**
                     * Defined by the ObjectTypes.TypeId enum.
                     */
                    typeId: {type: Sequelize.INTEGER.UNSIGNED},

                    /**
                     * Defined by the WorkItems.ActionType enum.
                     */ 
                    actionType: {type: Sequelize.INTEGER.UNSIGNED},

                    /**
                     * The expression string.
                     */ 
                    expression: {type: Sequelize.STRING}
                },{
                    freezeTableName: true,
                    tableName: 'bjt_activity_schedule_access_permission',
                    classMethods: {
                        onBeforeSync: function(models) {
                        },

                        onAfterSync: function(models) {
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists('bjt_activity_schedule_access_permission', 
                                    ['stageId', 'typeId', 'actionType'], {
                                        indexName: 'bjt_activity_schedule_access_permission_index'
                                    }),
                                SequelizeUtil.createIndexIfNotExists('bjt_activity_schedule_access_permission', ['stageId']),
                                SequelizeUtil.createIndexIfNotExists('bjt_activity_schedule_access_permission', ['stageId', 'typeId'])
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