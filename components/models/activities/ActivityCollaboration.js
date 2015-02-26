/**
 * Collaborator represents the model for groups collaborating on problem statements + their solutions.
 */
"use strict";

var componentsRoot = '../../';
var libRoot = componentsRoot + '../lib/';

var NoGapDef = require('nogap').Def;

var SequelizeUtil = require(libRoot + 'SequelizeUtil');


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
            __ctor: function() {
            },

            initBase: function() {
            },

            Private: {
                Caches: {
                    collaborations: {
                        idProperty: 'collaborationId'
                    }
                }
            }
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var ActivityCollaborationModel;

        return {
            __ctor: function () {
            },

            initModel: function() {
                /**
                 * A collaboration is a uni-directional relationship, indicating that
                 * the given collaborator group helps the given owner group on their activity item.
                 */
                return ActivityCollaborationModel = sequelize.define('ActivityCollaboration', {
                    collaborationId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                    activityId: {type: Sequelize.INTEGER.UNSIGNED},
                    ownerGid: {type: Sequelize.INTEGER.UNSIGNED},
                    /**
                     * GID of the collaborating group
                     */
                    collaboratorGid: {type: Sequelize.INTEGER.UNSIGNED}
                },{
                    freezeTableName: true,
                    tableName: 'bjt_activity_collaboration',
                    classMethods: {
                        onBeforeSync: function(models) {
                        },

                        onAfterSync: function(models) {
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists('bjt_activity_collaboration', ['activityId']),
                                SequelizeUtil.createIndexIfNotExists('bjt_activity_collaboration', ['collaboratorGid']),
                                SequelizeUtil.createIndexIfNotExists('bjt_activity_collaboration', 
                                    ['activityId', 'ownerGid', 'collaboratorGid'], 
                                    { indexOptions: 'UNIQUE'})
                            );
                        }
                    }
                });
            },

            initHost: function() {
            },

            Private: {
                __ctor: function () {
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

            initClient: function() {

            },

            Public: {
            }
        };
    })
});