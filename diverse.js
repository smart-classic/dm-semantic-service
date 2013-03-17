'use strict';

// SMART diversity web service
// File: diverse.js
var version = '20130310';

// Required modules
var EventEmitter = require('events').EventEmitter;
var util = require('./utility');
require('date-utils');


// Configuration
var config = require('./config');

var connString =
    'pg://' + config.dbCred + '@localhost/org_smartplatforms_semantic_diverse' + config.dbDeploySuffix;

// Setup for 'ready' event
module.exports = new EventEmitter();

// The 'isReady' structure to track when this module is fully setup
var isReady = {};
util.setNotReady(isReady, 'sections');
util.setNotReady(isReady, 'panels');
util.setNotReady(isReady, 'entityTypes');
util.setNotReady(isReady, 'specialties');

// Initialize globals
var sections = {};
var panels = {};
var entityTypes = {};
var specialties = [];
setupSections();
setupPanels();
setupEntityTypes();
setupSpecialties();

// The 'get entity types' call (GET /entity_types)
module.exports.getEntityTypes = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {pre:    {desc: 'diverse service', version: version},
                desc:   'Get the supported entity types.',
                return: 'The JSON array of entity type names: <div style="margin-left:30px;">' + JSON.stringify(Object.keys(entityTypes)) + '</div>'};
    } else {
        util.sendJson(req, res, Object.keys(entityTypes));
        return next();
    }
};

// The 'get specialties' call (GET /specialties)
module.exports.getSpecialties = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {pre:    '<hr style="margin-top:25px;">',
                desc:   'Get supported specialties.',
                return: 'A JSON array of specialty names and ids: <div style="margin-left:30px">' + JSON.stringify(specialties) + '</div>'};
    } else {
        util.sendJson(req, res, specialties);
        return next();
    }
};

// The 'create specialty' call (POST /specialty/create)
module.exports.createSpecialty = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Create a new specialty.',
                post:   [{name: 'name', desc: 'the specialty name'},
                         {name: 'accountId', desc: 'the id of the current user'}],
                return: 'The specId.',
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'INSERT INTO specialties (spec_name, created_by) VALUES ($1, $2) RETURNING spec_id';

        util.dbQuery(connString, req, res, q, [req.params.name, req.params.accountId],
            function (result) {
                if (result.rowCount > 0) {
                    reloadSpecialties(function () {
                        util.sendText(req, res, 200, result.rows[0].spec_id);
                    });
                } else {
                    util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'edit specialty' call (POST /specialty/edit/:specId)
module.exports.editSpecialty = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Edit the specialty :specId.',
                params: [{name: 'specId', desc: 'the specialty id'}],
                post:   [{name: 'name', desc: 'the new specialty name'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'UPDATE specialties SET spec_name = $1 WHERE spec_id = $2';

        util.dbQuery(connString, req, res, q, [req.params.name, req.params.specId],
            function (result) {
                if (result.rowCount > 0) {
                    reloadSpecialties(function () {
                        util.sendText(req, res, 200, 'OK');
                    });
                } else {
                    util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'delete specialty' call (POST /specialty/delete/:specId)
module.exports.deleteSpecialty = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Delete the specialty :specId.',
                params: [{name: 'specId', desc: 'the specialty id'}],
                return: "'OK'",
                error:  '400 if unsuccessful (not found).'};
    } else {
        var q = 'DELETE FROM specialties WHERE spec_id = $1';

        util.dbQuery(connString, req, res, q, [req.params.specId],
            function (result) {
                if (result.rowCount > 0) {
                    reloadSpecialties(function () {
                        util.sendText(req, res, 200, 'OK');
                    });
                } else {
                    util.sendText(req, res, 400, 'Not found: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'get sections' call (GET /sections)
module.exports.getSections = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {pre:    '<hr style="margin-top:25px;">',
                desc:   'Get the hash of supported sections.',
                return: 'The JSON hash of supported section info (name:id): <div style="margin-left:30px;">' + JSON.stringify(sections) + '</div>'};
    } else {
        util.sendJson(req, res, sections);
        return next();
    }
};

// The 'get section ordersets' DIAGNOSTIC call (GET /section/ordersets)
module.exports.getSectionOrdersetsDiag = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get all "raw" section display orders (DIAGNOSTIC).',
                return: 'A JSON array of section name, secId, entity type id, entity type, user/group/loc/orgname, specialty, numCols, column, order, hide (<i>true/false</i>) values: ' +
                        '<div style="margin-left:30px;">[{secName:secName1, secId:secId1, etId:etId1, entityType:etName1, entityName:eName1, specialty:specName1, numCols:num, column:secCol1, order:secOrder1, hide:secHide1},<br>' +
                        '<span style="margin-left:8px;">{secName:secName2, secId:secId2, etId:etId2, entityType:etName2, entityName:eName2, specialty:specName2, numCols:num, column:secCol2, order:secOrder2, hide:secHide2}, ... ]</span></div>'};
    } else {
        var q = 'SELECT sec_name AS "secName", sections.sec_id AS "secId", entity_types.entity_type_id AS "etId",' +
                '       entity_type_name AS "entityType", user_name AS "entityName", spec_name AS specialty, num_cols AS "numCols", sec_col AS "column", order_val AS order, hide' +
                '  FROM section_orders, sections, entity_types, specialties, users' +
                ' WHERE section_orders.sec_id = sections.sec_id' +
                '   AND section_orders.entity_type_id = entity_types.entity_type_id' +
                '   AND section_orders.spec_id = specialties.spec_id' +
                '   AND section_orders.entity_type_id = 6' +
                '   AND section_orders.entity_id = users.account_id' +
                ' UNION ALL ' +
                'SELECT sec_name AS "secName", sections.sec_id AS "secId", entity_types.entity_type_id AS "etId",' +
                '       entity_type_name AS "entityType", group_name AS "entityName", spec_name AS specialty, num_cols AS "numCols", sec_col AS "column", order_val AS order, hide' +
                '  FROM section_orders, sections, entity_types, specialties, groups' +
                ' WHERE section_orders.sec_id = sections.sec_id' +
                '   AND section_orders.entity_type_id = entity_types.entity_type_id' +
                '   AND section_orders.spec_id = specialties.spec_id' +
                '   AND section_orders.entity_type_id = 5' +
                '   AND section_orders.entity_id = groups.group_id::varchar' +
                ' UNION ALL ' +
                'SELECT sec_name AS "secName", sections.sec_id AS "secId", entity_types.entity_type_id AS "etId",' +
                '       entity_type_name AS "entityType", loc_name AS "entityName", spec_name AS specialty, num_cols AS "numCols", sec_col AS "column", order_val AS order, hide' +
                '  FROM section_orders, sections, entity_types, specialties, locations' +
                ' WHERE section_orders.sec_id = sections.sec_id' +
                '   AND section_orders.entity_type_id = entity_types.entity_type_id' +
                '   AND section_orders.spec_id = specialties.spec_id' +
                '   AND section_orders.entity_type_id = 4' +
                '   AND section_orders.entity_id = locations.loc_id::varchar' +
                ' UNION ALL ' +
                'SELECT sec_name AS "secName", sections.sec_id AS "secId", entity_types.entity_type_id AS "etId",' +
                '       entity_type_name AS "entityType", org_name AS "entityName", spec_name AS specialty, num_cols AS "numCols", sec_col AS "column", order_val AS order, hide' +
                '  FROM section_orders, sections, entity_types, specialties, organizations' +
                ' WHERE section_orders.sec_id = sections.sec_id' +
                '   AND section_orders.entity_type_id = entity_types.entity_type_id' +
                '   AND section_orders.spec_id = specialties.spec_id' +
                '   AND section_orders.entity_type_id = 3' +
                '   AND section_orders.entity_id = organizations.org_id::varchar' +
                ' UNION ALL ' +
                'SELECT sec_name AS "secName", sections.sec_id AS "secId", entity_types.entity_type_id AS "etId",' +
                '       entity_type_name AS "entityType", entity_type_name AS "entityName", spec_name AS specialty, num_cols AS "numCols", sec_col AS "column", order_val AS order, hide' +
                '  FROM section_orders, sections, entity_types, specialties' +
                ' WHERE section_orders.sec_id = sections.sec_id' +
                '   AND section_orders.entity_type_id = entity_types.entity_type_id' +
                '   AND section_orders.spec_id = specialties.spec_id' +
                '   AND section_orders.entity_type_id IN (2, 1)';

        util.dbQuery(connString, req, res, q, null,
            function (result) {
                if (result.rowCount > 0) {
                    util.sendJson(req, res, result.rows);
                } else {
                    util.sendJson(req, res, []);
                }
            });

        return next();
    }
};

// The 'get section ordersets for user' DIAGNOSTIC call (GET /section/ordersets/:accountId)
module.exports.getSectionOrdersetsForUserDiag = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get all specialty-based section display orders for this user (DIAGNOSTIC).',
                params: [{name: 'accountId', desc: 'the user identifier'}],
                return: 'A JSON hash of specialty names, each element an array of section name, secId, numCols, column, order, hide (<i>true/false</i>), and etId values: ' +
                        '<div style="margin-left:30px;">{specialty:[{secName:secName1, id:secId1, numCols:num, column:secCol1, order:secOrder1, hide:secHide1, etId:etId1},<br>' +
                        '<span style="margin-left:95px;">{secName:secName2, id:secId2, numCols:num, column:secCol2, order:secOrder2, hide:secHide2, etId:etId2}, ... ], ...}</span></div>'};
    } else {
        var q = 'SELECT spec_name, sec_name AS "secName", sections.sec_id AS "secId", num_cols AS "numCols", sec_col AS "column", order_val AS order, hide, entity_type_id AS "etId"' +
                '  FROM section_orders, sections, users, specialties' +
                ' WHERE sections.sec_id = section_orders.sec_id' +
                '   AND section_orders.spec_id = specialties.spec_id' +
                '   AND ((entity_type_id = 1) OR' +
                '        (entity_type_id = 2) OR' +
                '        ((account_id = $1) AND' +
                '         ((entity_type_id = 3) AND (entity_id = org_id::varchar)) OR' +
                '         ((entity_type_id = 4) AND (entity_id = loc_id::varchar)) OR' +
                '         ((entity_type_id = 5) AND (entity_id = group_id::varchar)) OR' +
                '         ((entity_type_id = 6) AND (entity_id = account_id))))';

        util.dbQuery(connString, req, res, q, [req.params.accountId],
            function (result) {
                if (result.rowCount > 0) {
                    // Group results by specialty
                    var specGroups = util.groupBy(result.rows, function (row) { return row.spec_name; });
                    // Iterate over each specialty group
                    for (var spec in specGroups) {
                        // For each secId, find the 'numCols', 'column', 'order', and 'hide' for the highest etId
                        var secIdGroups = util.groupBy(specGroups[spec], function (row) { return row.secId; });
                        var finalSections = [];
                        // Search each secId group
                        for (var secId in secIdGroups) {
                            var thisSection = secIdGroups[secId];
                            // Sort this group in descending order of etId
                            util.orderBy(thisSection, 'descending', function (row) { return row.etId; });
                            // Add the row with the highest etId to the final collection (and remove the spec_name)
                            delete thisSection[0].spec_name;
                            finalSections.push(thisSection[0]);
                        }
                        // Set the order for this specialty
                        specGroups[spec] = finalSections;
                    }
                    util.sendJson(req, res, specGroups);
                } else {
                    util.sendJson(req, res, {});
                }
            });

        return next();
    }
};

// The 'get section orderset' call (GET /section/orderset/:accountId/:specId)
module.exports.getSectionOrderset = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get the section display order for this user and specialty.',
                params: [{name: 'accountId', desc: 'the user identifier'},
                         {name: 'specId', desc: 'the specialty id'}],
                return: 'A JSON array of section name, secId, numCols, column, order, hide (<i>true/false</i>), and etId values: ' +
                        '<div style="margin-left:30px;">[{name:secName1, id:secId1, numCols:num, column:secCol1, order:secOrder1, hide:secHide1, etId:etId1},<br>' +
                        '<span style="margin-left:8px;">{name:secName2, id:secId2, numCols:num, column:secCol2, order:secOrder2, hide:secHide2, etId:etId2}, ... ]</span></div>'};
    } else {
        var q = 'SELECT sec_name AS name, sections.sec_id AS "secId", num_cols AS "numCols", sec_col AS "column", order_val AS order, hide, entity_type_id AS "etId"' +
                '  FROM section_orders, sections, users' +
                ' WHERE sections.sec_id = section_orders.sec_id' +
                '   AND ((entity_type_id = 1) OR' +
                '        ((section_orders.spec_id = $2) AND (entity_type_id = 2)) OR' +
                '        ((section_orders.spec_id = $2) AND (account_id = $1) AND' +
                '         (((entity_type_id = 3) AND (entity_id = org_id::varchar)) OR' +
                '          ((entity_type_id = 4) AND (entity_id = loc_id::varchar)) OR' +
                '          ((entity_type_id = 5) AND (entity_id = group_id::varchar)) OR' +
                '          ((entity_type_id = 6) AND (entity_id = account_id)))))';

        util.dbQuery(connString, req, res, q, [req.params.accountId, req.params.specId],
            function (result) {
                if (result.rowCount > 0) {
                    // For each secId, find the 'numCols', 'column', 'order' and 'hide' for the highest etId
                    var secIdGroups = util.groupBy(result.rows, function (row) { return row.secId; });
                    var finalSections = [];
                    // Search each secId group
                    for (var secId in secIdGroups) {
                        var thisSection = secIdGroups[secId];
                        // Sort this group in descending order of etId
                        util.orderBy(thisSection, 'descending', function (row) { return row.etId; });
                        // Add the row with the highest etId to the final collection
                        finalSections.push(thisSection[0]);
                    }
                    util.sendJson(req, res, finalSections);
                } else {
 //                   util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                    util.sendJson(req, res, []);
                }
            });

        return next();
    }
};

// The 'create section orderset' call (POST /section/orderset/create)
module.exports.createSectionOrderset = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Create/update a section display sequence.',
                post:   [{name: 'sections', desc: 'the JSON array of section info (order is index from 1 in each column, hide values are <i>true/false</i>):<br> ' +
                                    '<span style=margin-left:45px;>[{column:secCol1, order:secOrd1, id:secId1, hide:secHide1}, ... ]</span>'},
                         {name: 'numCols', desc: 'the number of columns in the display'},
                         {name: 'entityType', desc: 'the type of entity (user, group, location, organization, community, seed) setting the sequence'},
                         {name: 'entityId', desc: 'the id of the entity (use 0 for community, seed)'},
                         {name: 'specId', desc: 'the specialty id'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        // Check for valid entityType
        var entityTypeInfo = entityTypes[req.params.entityType];
        if (entityTypeInfo == undefined) {
            util.sendText(req, res, 400, 'Invalid entityType: ' + req.params.entityType);
            return next();
        }

        // Delete any prior orderset (TODO: This should be in a transaction)
        var q = 'DELETE FROM section_orders WHERE entity_type_id = $1 AND entity_id = $2 AND spec_id = $3';

        util.dbQuery(connString, req, res, q, [entityTypeInfo.id, req.params.entityId, req.params.specId],
            function (result) {
                // Now, create the new orderset
                var sections = [];
                try {
                    sections = JSON.parse(req.params.sections);
                } catch (e) {
                    util.sendText(req, res, 400, 'Invalid JSON: ' + req.params.sections);
                    return;
                }

                var valSet = [];
                sections.forEach(function (thisSection) {
                    var orderVal = entityTypeInfo.orderBase + thisSection.order;
                    valSet.push('(' + thisSection.id + ',' + entityTypeInfo.id + ',' + req.params.entityId + ',' +
                        req.params.specId + ',' + req.params.numCols + ',' + thisSection.column + ',' + orderVal + ',' + thisSection.hide + ')');
                });

                var q = 'INSERT INTO section_orders (sec_id, entity_type_id, entity_id, spec_id, num_cols, sec_col, order_val, hide) VALUES ' + valSet.join(',');

                util.dbQuery(connString, req, res, q, null,
                    function (result) {
                        if (result.rowCount > 0) {
                            util.sendText(req, res, 200, 'OK');
                        } else {
                            util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                        }
                    });
            });

        return next();
    }
};

// The 'delete section orderset' call (POST /section/orders/delete)
module.exports.deleteSectionOrderset = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Delete the section ordering for \'entityId\' and \'specId\'.',
                post:   [{name: 'entityType', desc: 'the type of entity (user, group, location, organization, community, seed) that set the sequence'},
                         {name: 'entityId', desc: 'the id of the entity (use 0 for community, seed)'},
                         {name: 'specId', desc: 'the specialty id'}],
                return: "'OK'",
                error:  '400 if unsuccessful (not found).'};
    } else {
        // Check for valid entityType
        var entityTypeInfo = entityTypes[req.params.entityType];
        if (entityTypeInfo == undefined) {
            util.sendText(req, res, 400, 'Invalid entityType: ' + req.params.entityType);
            return next();
        }

        var q = 'DELETE FROM section_orders WHERE entity_type_id = $1 AND entity_id = $2 AND spec_id = $3';

        util.dbQuery(connString, req, res, q, [entityTypeInfo.id, req.params.entityId, req.params.specId],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendText(req, res, 200, 'OK');
                } else {
                    util.sendText(req, res, 400, 'Not found: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'get panels' call (GET /panels)
module.exports.getPanels = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {pre:    '<hr style="margin-top:25px;">',
                desc:   'Get the hash of sections with defined panels.',
                return: 'The JSON hash of sections  with defined panels {secName: [{panId, panName, graphable},...]. ...}: <div style="margin-left:30px;">' + JSON.stringify(panels) + '</div>'};
    } else {
        util.sendJson(req, res, panels);
        return next();
    }
};

// The 'create panel' call (POST /panel/create)
module.exports.createPanel = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Create a new panel.',
                post:   [{name: 'name', desc: 'the panel name'},
                         {name: 'secId', desc: 'the id of the parent section'},
                         {name: 'graphable', desc: '<i>true</i> if the contents of the panel can be graphed, <i>false</i> if not'},
                         {name: 'accountId', desc: 'the id of the current user'}],
                return: 'The panelId.',
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'INSERT INTO panels (panel_name, sec_id, graphable, created_by, created_ts) VALUES ($1, $2, $3, $4, NOW()) RETURNING panel_id';

        util.dbQuery(connString, req, res, q, [req.params.name, req.params.secId, req.params.graphable, req.params.accountId],
            function (result) {
                if (result.rowCount > 0) {
                    reloadPanels(function () {
                        util.sendText(req, res, 200, result.rows[0].panel_id);
                    });
                } else {
                    util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'edit panel' call (POST /panel/edit/:panelId)
module.exports.editPanel = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Edit the panel :panelId.',
                params: [{name: 'panelId', desc: 'the panel id'}],
                post:   [{name: 'name', desc: 'the new panel name'},
                         {name: 'graphable', desc: 'whether the panel contents are graphable (<i>true/false</i>)'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'UPDATE panels SET panel_name = $2, graphable = $3 WHERE panel_id = $1';

        util.dbQuery(connString, req, res, q, [req.params.panelId, req.params.name, req.params.graphable],
            function (result) {
                if (result.rowCount > 0) {
                    reloadPanels(function () {
                        util.sendText(req, res, 200, 'OK');
                    });
                } else {
                    util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'delete panel' call (POST /panel/delete/:panelId)
module.exports.deletePanel = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Delete the panel :panelId.',
                params: [{name: 'panelId', desc: 'the panel id'}],
                return: "'OK'",
                error:  '400 if unsuccessful (not found).'};
    } else {
        var q = 'DELETE FROM panels WHERE panel_id = $1';

        util.dbQuery(connString, req, res, q, [req.params.panelId],
            function (result) {
                if (result.rowCount > 0) {
                    reloadPanels(function () {
                        util.sendText(req, res, 200, 'OK');
                    });
                } else {
                    util.sendText(req, res, 400, 'Not found: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'get panel ordersets' DIAGNOSTIC call (GET /panel/ordersets)
module.exports.getPanelOrdersetsDiag = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {pre:    '<hr style="margin-top:25px;">',
                desc:   'Get all "raw" panel display orders (DIAGNOSTIC).',
                return: 'A JSON array of section name, secId, panel name, panId, entity type id, entity type, user/group/loc/orgname, specialty, order, hide (<i>true/false</i>) values: ' +
                        '<div style="margin-left:30px;">[{secName:secName1, secId:secId1, panName:panName1, panId:panId1, etId:etId1, entityType:etName1, entityName:eName1, specialty:specName1, order:secOrder1, hide:secHide1},<br>' +
                        '<span style="margin-left:8px;">{secName:secName2, secId:secId2, panName:panName2, panId:panId2, etId:etId2, entityType:etName2, entityName:eName2, specialty:specName2, order:secOrder2, hide:secHide2}, ... ]</span></div>'};

    } else {
        var q = 'SELECT sec_name AS "secName", sections.sec_id AS "secId", panel_name AS "panName", panels.panel_id AS "panId",' +
                '       entity_types.entity_type_id AS "etId", entity_type_name AS "entityType", user_name AS "entityName",' +
                '       spec_name AS specialty, order_val AS order, hide' +
                '  FROM panel_orders, panels, sections, entity_types, specialties, users' +
                ' WHERE panel_orders.panel_id = panels.panel_id' +
                '   AND panel_orders.entity_type_id = entity_types.entity_type_id' +
                '   AND panel_orders.sec_id = sections.sec_id' +
                '   AND panel_orders.spec_id = specialties.spec_id' +
                '   AND panel_orders.entity_type_id = 6' +
                '   AND panel_orders.entity_id = users.account_id' +
                ' UNION ALL ' +
                'SELECT sec_name AS "secName", sections.sec_id AS "secId", panel_name AS "panName", panels.panel_id AS "panId",' +
                '       entity_types.entity_type_id AS "etId", entity_type_name AS "entityType", group_name AS "entityName",' +
                '       spec_name AS specialty, order_val AS order, hide' +
                '  FROM panel_orders, panels, sections, entity_types, specialties, groups' +
                ' WHERE panel_orders.panel_id = panels.panel_id' +
                '   AND panel_orders.entity_type_id = entity_types.entity_type_id' +
                '   AND panel_orders.sec_id = sections.sec_id' +
                '   AND panel_orders.spec_id = specialties.spec_id' +
                '   AND panel_orders.entity_type_id = 5' +
                '   AND panel_orders.entity_id = groups.group_id::varchar' +
                ' UNION ALL ' +
                'SELECT sec_name AS "secName", sections.sec_id AS "secId", panel_name AS "panName", panels.panel_id AS "panId",' +
                '       entity_types.entity_type_id AS "etId", entity_type_name AS "entityType", loc_name AS "entityName",' +
                '       spec_name AS specialty, order_val AS order, hide' +
                '  FROM panel_orders, panels, sections, entity_types, specialties, locations' +
                ' WHERE panel_orders.panel_id = panels.panel_id' +
                '   AND panel_orders.entity_type_id = entity_types.entity_type_id' +
                '   AND panel_orders.sec_id = sections.sec_id' +
                '   AND panel_orders.spec_id = specialties.spec_id' +
                '   AND panel_orders.entity_type_id = 4' +
                '   AND panel_orders.entity_id = locations.loc_id::varchar' +
                ' UNION ALL ' +
                'SELECT sec_name AS "secName", sections.sec_id AS "secId", panel_name AS "panName", panels.panel_id AS "panId",' +
                '       entity_types.entity_type_id AS "etId", entity_type_name AS "entityType", org_name AS "entityName",' +
                '       spec_name AS specialty, order_val AS order, hide' +
                '  FROM panel_orders, panels, sections, entity_types, specialties, organizations' +
                ' WHERE panel_orders.panel_id = panels.panel_id' +
                '   AND panel_orders.entity_type_id = entity_types.entity_type_id' +
                '   AND panel_orders.sec_id = sections.sec_id' +
                '   AND panel_orders.spec_id = specialties.spec_id' +
                '   AND panel_orders.entity_type_id = 3' +
                '   AND panel_orders.entity_id = organizations.org_id::varchar' +
                ' UNION ALL ' +
                'SELECT sec_name AS "secName", sections.sec_id AS "secId", panel_name AS "panName", panels.panel_id AS "panId",' +
                '       entity_types.entity_type_id AS "etId", entity_type_name AS "entityType", entity_type_name AS "entityName",' +
                '       spec_name AS specialty, order_val AS order, hide' +
                '  FROM panel_orders, panels, sections, entity_types, specialties' +
                ' WHERE panel_orders.panel_id = panels.panel_id' +
                '   AND panel_orders.entity_type_id = entity_types.entity_type_id' +
                '   AND panel_orders.sec_id = sections.sec_id' +
                '   AND panel_orders.spec_id = specialties.spec_id' +
                '   AND panel_orders.entity_type_id IN (2, 1)';

        util.dbQuery(connString, req, res, q, null,
            function (result) {
                if (result.rowCount > 0) {
                    util.sendJson(req, res, result.rows);
                } else {
                    util.sendJson(req, res, []);
                }
            });

        return next();
    }
};

// The 'get panel ordersets for user' DIAGNOSTIC call (GET /panel/ordersets/:section/:accountId)
module.exports.getPanelOrdersetsForUserDiag = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get all specialty-based panel display orders for this section and user (DIAGNOSTIC).',
                params: [{name: 'section', desc:'the name of the section'},
                         {name: 'accountId', desc: 'the user identifier'}],
                return: 'A JSON hash of specialty names, each element an array of panel names, panIds, order, hide (<i>true/false</i>), and etId values: ' +
                        '<div style="margin-left:30px;">{specialty:[{name:panName1, id:panId1, order:panOrder1, hide:panHide1, etId:etId1},<br>' +
                        '<span style="margin-left:94px;">{name:panName2, id:panId2, order:panOrder2, hide:panHide2, etId:etId2}, ... ], ...}</span></div>'};
    } else {
        var q = 'SELECT spec_name, panel_name AS name, panels.panel_id AS id, order_val AS order, hide, entity_type_id AS "etId"' +
                '  FROM panel_orders, panels, sections, users, specialties' +
                ' WHERE panel_orders.panel_id = panels.panel_id' +
                '   AND panel_orders.spec_id = specialties.spec_id' +
                '   AND panel_orders.sec_id = sections.sec_id' +
                '   AND sec_name = $1' +
                '   AND ((entity_type_id = 1) OR ' +
                '        (entity_type_id = 2) OR' +
                '        ((account_id = $2) AND' +
                '         ((entity_type_id = 3) AND (entity_id = org_id::varchar)) OR' +
                '         ((entity_type_id = 4) AND (entity_id = loc_id::varchar)) OR' +
                '         ((entity_type_id = 5) AND (entity_id = group_id::varchar)) OR' +
                '         ((entity_type_id = 6) AND (entity_id = account_id))))';

        util.dbQuery(connString, req, res, q, [req.params.section, req.params.accountId],
            function (result) {
                if (result.rowCount > 0) {
                    // Group results by specialty
                    var specGroups = util.groupBy(result.rows, function (row) { return row.spec_name; });
                    // Iterate over each specialty group
                    for (var spec in specGroups) {
                        // For each id, find the 'order' and 'hide' for the highest etId
                        var idGroups = util.groupBy(specGroups[spec], function (row) { return row.id; });
                        var finalPanels = [];
                        // Search each id group
                        for (var id in idGroups) {
                            var thisPanel = idGroups[id];
                            // Sort this group in descending order of etId
                            util.orderBy(thisPanel, 'descending', function (row) { return row.etId; });
                            // Add the row with the highest etId to the final collection (and remove the spec_name)
                            delete thisPanel[0].spec_name;
                            finalPanels.push(thisPanel[0]);
                        }
                        // Set the order for this specialty
                        specGroups[spec] = finalPanels;
                    }
                    util.sendJson(req, res, specGroups);
                } else {
                    util.sendJson(req, res, {});
                }
            });

        return next();
    }
};

// The 'get panel orderset' call (GET /panel/orderset/:section/:accountId/:specId)
module.exports.getPanelOrderset = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get the panel display order for section :section.',
                params:   [{name: 'section', desc: 'the name of the section'},
                           {name: 'accountId', desc: 'the user identifier'},
                           {name: 'specId', desc: 'the specialty id'}],
                return: 'A JSON array of panel names, ids, order, hide (<i>true/false</i>), and etId values: ' +
                        '<div style="margin-left:30px;">[{name:panName1, id:panId1, order:panOrder1, hide:panHide1, etId:panEtId1},<br>' +
                        '<span style="margin-left:8px;">{name:panName2, id:panId2, order:panOrder2, hide:panHide2, etId:panEtId2}, ... ]</span></div>'};
    } else {
        var q = 'SELECT panel_name AS name, panels.panel_id AS "panelId", order_val AS order, hide, entity_type_id AS "etId"' +
                '  FROM sections, panel_orders, panels, users' +
                ' WHERE panels.panel_id = panel_orders.panel_id' +
                '   AND sections.sec_id = panel_orders.sec_id' +
                '   AND sections.sec_name = $3' +
                '   AND ((entity_type_id = 1) OR' +
                '        ((panel_orders.spec_id = $2) AND (entity_type_id = 2)) OR' +
                '        ((panel_orders.spec_id = $2) AND (account_id = $1) AND' +
                '         (((entity_type_id = 3) AND (entity_id = org_id::varchar)) OR' +
                '          ((entity_type_id = 4) AND (entity_id = loc_id::varchar)) OR' +
                '          ((entity_type_id = 5) AND (entity_id = group_id::varchar)) OR' +
                '          ((entity_type_id = 6) AND (entity_id = account_id)))))';

        util.dbQuery(connString, req, res, q, [req.params.accountId, req.params.specId, req.params.section],
            function (result) {
                if (result.rowCount > 0) {
                    // For each panelId, find the 'order' and 'hide' for the highest etId
                    var panelIdGroups = util.groupBy(result.rows, function (row) { return row.panelId; });
                    var finalPanels = [];
                    // Search each panelId group
                    for (var panelId in panelIdGroups) {
                        var thisPanel = panelIdGroups[panelId];
                        // Sort this group in descending order of etId
                        util.orderBy(thisPanel, 'descending', function (row) { return row.etId; });
                        // Add the row with the highest etId to the final collection
                        finalPanels.push(thisPanel[0]);
                    }
                    util.sendJson(req,res, finalPanels);
                } else {
                    util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'create panel orderset' call (POST /panel/orderset/create)
module.exports.createPanelOrderset = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Create/update a panel display sequence.',
                post:   [{name: 'panels', desc: 'the JSON array of panel info (in display sequence, hide values are <i>true/false</i>): ' +
                                    '[{id:panelId1, hide:panelHide1}, ... ]'},
                         {name: 'secId', desc: 'the id of the containing section'},
                         {name: 'entityType', desc: 'the type of entity (user, group, location, organization, community, seed) setting the sequence'},
                         {name: 'entityId', desc: 'the id of the entity (use 0 for community, seed)'},
                         {name: 'specId', desc: 'the specialty id'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        // Check for valid entityType
        var entityTypeInfo = entityTypes[req.params.entityType];
        if (entityTypeInfo == undefined) {
            util.sendText(req, res, 400, 'Invalid entityType: ' + req.params.entityType);
            return next();
        }

        // Delete any prior orderset (TODO: This should be in a transaction)
        var q = 'DELETE FROM panel_orders WHERE sec_id = $1 AND entity_type_id = $2 AND entity_id = $3 AND spec_id = $4';

        util.dbQuery(connString, req, res, q, [req.params.secId, entityTypeInfo.id, req.params.entityId, req.params.specId],
            function (result) {
                // Now, create the new orderset
                var panels = [];
                try {
                    panels = JSON.parse(req.params.panels);
                } catch (e) {
                    util.sendText(req, res, 400, 'Invalid JSON: ' + req.params.panels);
                    return;
                }

                var valSet = [];
                panels.forEach(function (thisPanel, panelNum) {
                    var orderVal = entityTypeInfo.orderBase + panelNum;
                    valSet.push('(' + req.params.secId + ',' + thisPanel.id + ',' + entityTypeInfo.id + ',' +
                        req.params.entityId + ',' + req.params.specId + ',' + orderVal + ',' + thisPanel.hide + ')');
                });

                var q = 'INSERT INTO panel_orders (sec_id, panel_id, entity_type_id, entity_id, spec_id, order_val, hide) VALUES ' + valSet.join(',');

                util.dbQuery(connString, req, res, q, null,
                    function (result) {
                        if (result.rowCount > 0) {
                            util.sendText(req, res, 200, 'OK');
                        } else {
                            util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                        }
                    });
            });

        return next();
    }
};

// The 'delete panel orderset' call (POST /panel/orderset/delete/:forSecId)
module.exports.deletePanelOrderset = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Delete the panel ordering for section :forSecId.',
                params: [{name: 'forSecId', desc: 'the section id'}],
                post:   [{name: 'entityType', desc: 'the type of entity (user, group, location, organization, community, seed) that set the sequence'},
                         {name: 'entityId', desc: 'the id of the entity (use 0 for community, seed)'},
                         {name: 'specId', desc: 'the specialty id'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values or not found).'};
    } else {
        // Check for valid entityType
        var entityTypeInfo = entityTypes[req.params.entityType];
        if (entityTypeInfo == undefined) {
            util.sendText(req, res, 400, 'Invalid entityType: ' + req.params.entityType);
            return next();
        }

        var q = 'DELETE FROM panel_orders WHERE sec_id = $1 AND entity_type_id = $2 AND entity_id = $3 AND spec_id = $4';

        util.dbQuery(connString, req, res, q, [req.params.forSecId, entityTypeInfo.id, req.params.entityId, req.params.specId],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendText(req, res, 200, 'OK');
                } else {
                    util.sendText(req, res, 400, 'Not found: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'get test name' call (GET /test/name/:loinc)
module.exports.getTestName = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {pre:    '<hr style="margin-top:25px;">',
                desc:   'Get the "preferred" name for a test',
                params:  [{name: 'loinc', desc: 'the id of the test'}],
                return: 'The "preferred" name',
                error:  '400 if unsuccessful (not found).'};
    } else {
        var q = 'SELECT preferred_name FROM loinc_extra WHERE loinc_num = $1';

        util.dbQuery(connString, req, res, q, [req.params.loinc],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendText(req, res, 200, result.rows[0].preferred_name);
                } else {
                    util.sendText(req, res, 400, 'NotFound: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'create test name' call (POST /test/name/create)
module.exports.createTestName = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Define a "preferred" test name.',
                post:   [{name: 'loinc', desc: 'the test id'},
                         {name: 'name', desc: 'the preferred name for this test'},
                         {name: 'accountId', desc: 'the id of the current user'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'INSERT INTO loinc_extra (loinc_num, preferred_name, created_by) VALUES ($1, $2, $3)';

        util.dbQuery(connString, req, res, q, [req.params.loinc, req.params.name, req.params.accountId],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendText(req, res, 200, 'OK');
                } else {
                    util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'edit test name' call (POST /test/name/edit/:loinc)
module.exports.editTestName = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Edit the "preferred" test name for :loinc.',
                params: [{name: 'loinc', desc: 'the test id'}],
                post:   [{name: 'name', desc: 'the new preferred name'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'UPDATE loinc_extra SET preferred_name = $1 WHERE loinc_num = $2';

        util.dbQuery(connString, req, res, q, [req.params.name, req.params.loinc],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendText(req, res, 200, 'OK');
                } else {
                    util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'delete test name' call (POST /test/name/delete/:loinc)
module.exports.deleteTestName = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Delete the "preferred" test name for :loinc.',
                params: [{name: 'loinc', desc: 'the test id'}],
                return: "'OK'",
                error:  '400 if unsuccessful (not found).'};
    } else {
        var q = 'DELETE FROM loinc_extra WHERE loinc_num = $1';

        util.dbQuery(connString, req, res, q, [req.params.loinc],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendText(req, res, 200, 'OK');
                } else {
                    util.sendText(req, res, 400, 'Not found: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'get tests' call (POST /test/:accountId/:specId/:cid)
module.exports.getTests = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get tests to display for user, specialty, and problem.',
                params: [{name: 'accountId', desc: 'the id of the current user'},
                         {name: 'specId', desc: 'the specialty id'},
                         {name: 'cid', desc: 'the problem id'}],
                post:   [{name: 'restrict', desc: 'a JSON hash of patient info (gender, age) to refine test ranges'}],
                return: 'A JSON array of panels:<br>' +
                        '<div style="margin-left:30px;">[{panelName:name1, panelId:id1, panelOrder:ord1, panelHide:hideval1, panelEtId:etId1<br>' +
                        '<span style="margin-left:18px;">tests:[{testName:name1, loinc:id1, assocId:assoc1Id, testOrder:ord1, testHide:hideval1, testEtId:etId1, testMin:min1, testMax:max1, testUnits:units1},</span><br>' +
                        '<span style="margin-left:68px;">{testName:name2, loinc:id2, assocId:assoc2Id, testOrder:ord2, testHide:hideval2, testEtId:etId2, testMin:min1, testMax:max1, testUnits:units1}, ...]},</span><br>' +
                        '<span style="margin-left:8px;">{panelName:name2, panelId:id2, panelOrder:ord2, panelHide:hideval2, panelEtId:etId2</span><br>' +
                        '<span style="margin-left:18px;">tests:[ ... ]}, ... ]</span></div>'};
    } else {
        // Get the potential panel rows
        var ERROR = 'ERROR';
        var finalPanels;
        var q1 = 'SELECT panel_name AS "panelName", panels.panel_id AS "panelId", graphable, panel_orders.order_val AS "panelOrder", panel_orders.hide AS panelHide,' +
                 '       panel_orders.entity_type_id AS "panelEtId"' +
                 '  FROM panel_orders, panels, sections, users' +
                 ' WHERE panels.panel_id = panel_orders.panel_id' +
                 '   AND sections.sec_id = panel_orders.sec_id' +
                 '   AND sec_name = \'Tests\'' +
                 '   AND ((panel_orders.entity_type_id = 1) OR' +
                 '        ((panel_orders.spec_id = $2) AND (panel_orders.entity_type_id = 2) OR' +
                 '        ((panel_orders.spec_id = $2) AND (account_id = $1) AND' +
                 '         (((panel_orders.entity_type_id = 3) AND (panel_orders.entity_id = users.org_id::varchar)) OR' +
                 '          ((panel_orders.entity_type_id = 4) AND (panel_orders.entity_id = users.loc_id::varchar)) OR' +
                 '          ((panel_orders.entity_type_id = 5) AND (panel_orders.entity_id = users.group_id::varchar)) OR' +
                 '          ((panel_orders.entity_type_id = 6) AND (panel_orders.entity_id = users.account_id))))))';

        util.dbQuery(connString, req, res, q1, [req.params.accountId, req.params.specId],
            function (result) {
                if (result.rowCount > 0) {
                    // Group the panel order rows by panel id
                    var panelIdGroups = util.groupBy(result.rows, function (row) { return row.panelId; });
                    // Process each panel id
                    finalPanels = [];
                    for (var panelId in panelIdGroups) {
                        // Order by panelEtId
                        util.orderBy(panelIdGroups[panelId], 'descending', function (row) { return row.panelEtId; });
                        // Add the first row (highest panelEtId) to the final panel order
                        finalPanels.push(panelIdGroups[panelId][0]);
                    }
                    // See if we have both query (successful) results
                    if (finalTests == ERROR) {
                        util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                    } else if (finalTests != undefined) {
                        processPanelsAndTests(req, res, finalPanels, finalTests);
                    }
                } else {
                    finalPanels = ERROR;
                    if (finalTests != undefined) {
                        util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                    }
                }
            });

        // Get the potential test rows (union handles getting testName preferentially from loinc_extra else loinc table)
        var finalTests;
        var q2 = 'SELECT test_orders.panel_id AS "panelId", preferred_name AS "testName", loinc.loinc_num AS loinc, test_orders.tp_id AS "testAssocId",' +
                 '       test_orders.order_val AS "testOrder", test_orders.hide AS "testHide", test_orders.entity_type_id AS "testEtId",' +
                 '       low_val AS "testMin", high_val AS "testMax", units AS "testUnits"' +
                 '  FROM test_orders, tests_problems, loinc, loinc_extra, test_ranges, users' +
                 ' WHERE tests_problems.tp_id = test_orders.tp_id' +
                 '   AND tests_problems.panel_id = test_orders.panel_id' +
                 '   AND tests_problems.spec_id = test_orders.spec_id' +
                 '   AND tests_problems.snomed_cid = $2' +
                 '   AND tests_problems.loinc_num = loinc.loinc_num' +
                 '   AND tests_problems.loinc_num = loinc_extra.loinc_num' +
                 '   AND tests_problems.loinc_num = test_ranges.loinc_num' +
                 '   AND test_ranges.gender = $3' +
                 '   AND test_ranges.min_age <= $4 AND test_ranges.max_age > $4' +
                 '   AND ((test_orders.entity_type_id = 1) OR' +
                 '        ((tests_problems.fac_type_id = users.fac_type_id) AND' +
                 '         ((test_orders.spec_id = $1) AND (test_orders.entity_type_id = 2) OR' +
                 '         ((test_orders.spec_id = $1) AND (users.account_id = $5) AND' +
                 '          (((test_orders.entity_type_id = 3) AND (test_orders.entity_id = users.org_id::varchar)) OR' +
                 '           ((test_orders.entity_type_id = 4) AND (test_orders.entity_id = users.loc_id::varchar)) OR' +
                 '           ((test_orders.entity_type_id = 5) AND (test_orders.entity_id = users.group_id::varchar)) OR' +
                 '           ((test_orders.entity_type_id = 6) AND (test_orders.entity_id = users.account_id)))))))' +
                 ' UNION ' +
                 'SELECT test_orders.panel_id AS "panelId", shortname AS "testName", loinc.loinc_num AS loinc, test_orders.tp_id AS "testAssocId",' +
                 '       test_orders.order_val AS "testOrder", test_orders.hide AS "testHide", test_orders.entity_type_id AS "testEtId",' +
                 '       low_val AS "testMin", high_val AS "testMax", units AS "testUnits"' +
                 '  FROM test_orders, tests_problems, loinc, test_ranges, users' +
                 ' WHERE tests_problems.tp_id = test_orders.tp_id' +
                 '   AND tests_problems.panel_id = test_orders.panel_id' +
                 '   AND tests_problems.spec_id = test_orders.spec_id' +
                 '   AND tests_problems.snomed_cid = $2' +
                 '   AND tests_problems.loinc_num = loinc.loinc_num' +
                 '   AND tests_problems.loinc_num = test_ranges.loinc_num' +
                 '   AND test_ranges.gender = $3' +
                 '   AND test_ranges.min_age <= $4 AND test_ranges.max_age > $4' +
                 '   AND NOT EXISTS (SELECT * FROM loinc_extra WHERE loinc_extra.loinc_num = loinc.loinc_num)' +
                 '   AND ((test_orders.entity_type_id = 1) OR' +
                 '        ((tests_problems.fac_type_id = users.fac_type_id) AND' +
                 '         ((test_orders.spec_id = $1) AND (test_orders.entity_type_id = 2) OR' +
                 '         ((test_orders.spec_id = $1) AND (users.account_id = $5) AND' +
                 '          (((test_orders.entity_type_id = 3) AND (test_orders.entity_id = users.org_id::varchar)) OR' +
                 '           ((test_orders.entity_type_id = 4) AND (test_orders.entity_id = users.loc_id::varchar)) OR' +
                 '           ((test_orders.entity_type_id = 5) AND (test_orders.entity_id = users.group_id::varchar)) OR' +
                 '           ((test_orders.entity_type_id = 6) AND (test_orders.entity_id = users.account_id)))))))';

        try {
            req.params.restrict = JSON.parse(req.params.restrict);
        } catch (e) {
            util.sendText(req, res, 400, 'Invalid JSON: ' + req.params.restrict);
            return;
        }
        util.dbQuery(connString, req, res, q2, [req.params.specId, req.params.cid,
            req.params.restrict.gender, req.params.restrict.age, req.params.accountId],
            function (result) {
                if (result.rowCount > 0) {
                    // Group the test order rows by test id (loinc)
                    var loincGroups = util.groupBy(result.rows, function (row) { return row.loinc; });
                    // Process each loinc value
                    finalTests = [];
                    for (var loinc in loincGroups) {
                        // Order by testEtId
                        util.orderBy(loincGroups[loinc], 'descending', function (row) { return row.testEtId; });
                        // Add the first row (highest testEtId) to the final test order
                        finalTests.push(loincGroups[loinc][0]);
                    }
                    // See if we have both query (successful) results
                    if (finalPanels == ERROR) {
                        util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                    } else if (finalPanels != undefined) {
                        processPanelsAndTests(req, res, finalPanels, finalTests);
                    }
                } else {
                    finalTests = ERROR;
                    if (finalPanels != undefined) {
                        util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                    }
                }
            });

        return next();
    }
};

function processPanelsAndTests(req, res, finalPanels, finalTests) {
    finalPanels.forEach(function (thisPanel) {
        // For this panel, get tests with matching panelId
        var matchingTests = finalTests.filter(function (thisTest) { return thisTest.panelId == thisPanel.panelId; });
        // Strip out (no longer needed) panelId & construct "range" from "testMin" and "testMax"
        matchingTests.forEach(function (thisTest) {
            delete thisTest.panelId;
            thisTest.range = thisTest.testMin + '-' + thisTest.testMax;
        });
        // Sort the matching tests in increasing testOrder
        util.orderBy(matchingTests, 'ascending', function (thisTest) { return thisTest.testOrder; });
        // Add sorted tests to the panel
        thisPanel['tests'] = matchingTests;
    });

    // Send response
    util.sendJson(req, res, finalPanels);
}


// The 'search for test' call (POST /test/find/:searchFor)
module.exports.searchForTest = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Search for any tests whose name contains the search string :searchFor',
                params: [{name: 'searchFor', desc: 'the string to search for'}],
                return: 'A JSON array of (name, loinc) hashes'};
    } else {
        var q = '(SELECT preferred_name AS name, loinc_num AS loinc FROM loinc_extra' +
                ' WHERE preferred_name ILIKE $1 LIMIT $2)' +
                ' UNION ALL ' +
                '(SELECT shortname AS name, loinc_num AS loinc FROM loinc' +
                ' WHERE shortname ILIKE $1 LIMIT $2)' +
                ' ORDER BY 1';

        util.dbQuery(connString, req, res, q, ['%' + req.params.searchFor + '%', config.dbLimitResults],
            function (result) {
                util.sendJson(req, res, result.rows);
            });

        return next();
    }
};

// The 'create test association' call (POST /test/create)
module.exports.createTestAssoc = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Create a new test association.',
                post:   [{name: 'accountId', desc: 'the id of the current user'},
                         {name: 'specId', desc: 'the specialty id'},
                         {name: 'cid', desc: 'the problem id'},
                         {name: 'panelId', desc: 'the panel id'},
                         {name: 'loinc', desc: 'the test id'}],
                return: 'The assocId.',
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'INSERT INTO tests_problems (loinc_num, snomed_cid, panel_id, spec_id, fac_type_id, created_by)' +
                '     SELECT $1, $2, $3, $4, fac_type_id, $5 FROM users' +
                '      WHERE account_id = $5' +
                '  RETURNING tp_id AS assocId';

        util.dbQuery(connString, req, res, q, [req.params.loinc, req.params.cid, req.params.panelId, req.params.specId, req.params.accountId],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendText(req, res, 200, result.rows[0].assocId);
                } else {
                    util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'delete test association' call (POST /test/delete/:assocId)
module.exports.deleteTestAssoc = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Delete the test association :assocId.',
                params: [{name: 'assocId', desc: 'the test association id'}],
                return: "'OK'",
                error:  '400 if unsuccessful (not found).'};
    } else {
        var q = 'DELETE FROM tests_problems WHERE tp_id = $1';

        util.dbQuery(connString, req, res, q, [req.params.assocId],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendText(req, res, 200, result.rows[0].assocId);
                } else {
                    util.sendText(req, res, 400, 'Not found: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'get test ordersets' DIAGNOSTIC call (GET /test/ordersets)
module.exports.getTestOrdersetsDiag = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get all "raw" test display orders (DIAGNOSTIC).',
                return: 'A JSON array of panel name, panId, entity type id, entity type, user/group/loc/orgname, specialty, order, hide (<i>true/false</i>), loinc, cid, flag, facility type, gender, min age, max age, low val, high val, units, test name, preferred name values: ' +
                        '<div style="margin-left:30px;">[{panName:panName1, panId:panId1, etId:etId1, entityType:etName1, entityName:eName1, specialty:specName1, order:panOrder1, hide:panHide1, loinc:loinc1, cid:cid1, flag:flag1, facType:facType1, gender:gen1, minAge:min1, maxAge:max1, lowVal:low1, highVal:high1, units:units1. testName:name1, prefName:pref1},<br>' +
                        '<span style="margin-left:8px;">{panName:panName2, panId:panId2, etId:etId2, entityType:etName2, entityName:eName2, specialty:specName2, order:panOrder2, hide:panHide2, loinc:loinc2, cid:cid2, flag:flag2, facType:facType2, gender:gen2, minAge:min2, maxAge:max2, lowVal:low2, highVal:high2, units:units2, testName:name1, prefName:pref1}, ... ]</span></div>'};
    } else {
        var q = 'SELECT panel_name AS "panName", panels.panel_id AS "panId", entity_types.entity_type_id AS "etId",' +
                '       entity_type_name AS "entityType", user_name AS "entityName", spec_name AS specialty,' +
                '       order_val AS order, hide, loinc.loinc_num AS loinc, snomed_cid AS cid, flag, fac_type_name AS "facType",' +
                '       gender, min_age AS "minAge", max_age AS "maxAge", low_val AS "lowVal", high_val AS "highVal", units,' +
                '       shortname AS "testName", preferred_name AS "prefName"' +
                '  FROM sections' +
                '  JOIN panels ON (panels.sec_id = sections.sec_id)' +
                '  JOIN test_orders ON (test_orders.panel_id = panels.panel_id)' +
                '  JOIN tests_problems ON (tests_problems.panel_id = panels.panel_id AND tests_problems.tp_id = test_orders.tp_id)' +
                '  JOIN entity_types ON (entity_types.entity_type_id = test_orders.entity_type_id)' +
                '  JOIN specialties ON (specialties.spec_id = test_orders.spec_id AND specialties.spec_id = tests_problems.spec_id)' +
                '  JOIN facility_types ON (facility_types.fac_type_id = tests_problems.fac_type_id)' +
                '  JOIN users ON (users.account_id = test_orders.entity_id)' +
                '  JOIN loinc ON (loinc.loinc_num = tests_problems.loinc_num)' +
                '  JOIN test_ranges ON (test_ranges.loinc_num = loinc.loinc_num)' +
                '  LEFT OUTER JOIN loinc_extra ON (loinc_extra.loinc_num = loinc.loinc_num)' +
                ' WHERE test_orders.entity_type_id = 6' +
                ' UNION ALL ' +
                'SELECT panel_name AS "panName", panels.panel_id AS "panId", entity_types.entity_type_id AS "etId",' +
                '       entity_type_name AS "entityType", group_name AS "entityName", spec_name AS specialty,' +
                '       order_val AS order, hide, loinc.loinc_num AS loinc, snomed_cid AS cid, flag, fac_type_name AS "facType",' +
                '       gender, min_age AS "minAge", max_age AS "maxAge", low_val AS "lowVal", high_val AS "highVal", units,' +
                '       shortname AS "testName", preferred_name AS "prefName"' +
                '  FROM sections' +
                '  JOIN panels ON (panels.sec_id = sections.sec_id)' +
                '  JOIN test_orders ON (test_orders.panel_id = panels.panel_id)' +
                '  JOIN tests_problems ON (tests_problems.panel_id = panels.panel_id AND tests_problems.tp_id = test_orders.tp_id)' +
                '  JOIN entity_types ON (entity_types.entity_type_id = test_orders.entity_type_id)' +
                '  JOIN specialties ON (specialties.spec_id = test_orders.spec_id AND specialties.spec_id = tests_problems.spec_id)' +
                '  JOIN facility_types ON (facility_types.fac_type_id = tests_problems.fac_type_id)' +
                '  JOIN groups ON (groups.group_id::varchar = test_orders.entity_id)' +
                '  JOIN loinc ON (loinc.loinc_num = tests_problems.loinc_num)' +
                '  JOIN test_ranges ON (test_ranges.loinc_num = loinc.loinc_num)' +
                '  LEFT OUTER JOIN loinc_extra ON (loinc_extra.loinc_num = loinc.loinc_num)' +
                ' WHERE test_orders.entity_type_id = 5' +
                ' UNION ALL ' +
                'SELECT panel_name AS "panName", panels.panel_id AS "panId", entity_types.entity_type_id AS "etId",' +
                '       entity_type_name AS "entityType", loc_name AS "entityName", spec_name AS specialty,' +
                '       order_val AS order, hide, loinc.loinc_num AS loinc, snomed_cid AS cid, flag, fac_type_name AS "facType",' +
                '       gender, min_age AS "minAge", max_age AS "maxAge", low_val AS "lowVal", high_val AS "highVal", units,' +
                '       shortname AS "testName", preferred_name AS "prefName"' +
                '  FROM sections' +
                '  JOIN panels ON (panels.sec_id = sections.sec_id)' +
                '  JOIN test_orders ON (test_orders.panel_id = panels.panel_id)' +
                '  JOIN tests_problems ON (tests_problems.panel_id = panels.panel_id AND tests_problems.tp_id = test_orders.tp_id)' +
                '  JOIN entity_types ON (entity_types.entity_type_id = test_orders.entity_type_id)' +
                '  JOIN specialties ON (specialties.spec_id = test_orders.spec_id AND specialties.spec_id = tests_problems.spec_id)' +
                '  JOIN facility_types ON (facility_types.fac_type_id = tests_problems.fac_type_id)' +
                '  JOIN locations ON (locations.loc_id::varchar = test_orders.entity_id)' +
                '  JOIN loinc ON (loinc.loinc_num = tests_problems.loinc_num)' +
                '  JOIN test_ranges ON (test_ranges.loinc_num = loinc.loinc_num)' +
                '  LEFT OUTER JOIN loinc_extra ON (loinc_extra.loinc_num = loinc.loinc_num)' +
                ' WHERE test_orders.entity_type_id = 4' +
                ' UNION ALL ' +
                'SELECT panel_name AS "panName", panels.panel_id AS "panId", entity_types.entity_type_id AS "etId",' +
                '       entity_type_name AS "entityType", org_name AS "entityName", spec_name AS specialty,' +
                '       order_val AS order, hide, loinc.loinc_num AS loinc, snomed_cid AS cid, flag, fac_type_name AS "facType",' +
                '       gender, min_age AS "minAge", max_age AS "maxAge", low_val AS "lowVal", high_val AS "highVal", units,' +
                '       shortname AS "testName", preferred_name AS "prefName"' +
                '  FROM sections' +
                '  JOIN panels ON (panels.sec_id = sections.sec_id)' +
                '  JOIN test_orders ON (test_orders.panel_id = panels.panel_id)' +
                '  JOIN tests_problems ON (tests_problems.panel_id = panels.panel_id AND tests_problems.tp_id = test_orders.tp_id)' +
                '  JOIN entity_types ON (entity_types.entity_type_id = test_orders.entity_type_id)' +
                '  JOIN specialties ON (specialties.spec_id = test_orders.spec_id AND specialties.spec_id = tests_problems.spec_id)' +
                '  JOIN facility_types ON (facility_types.fac_type_id = tests_problems.fac_type_id)' +
                '  JOIN organizations ON (organizations.org_id::varchar = test_orders.entity_id)' +
                '  JOIN loinc ON (loinc.loinc_num = tests_problems.loinc_num)' +
                '  JOIN test_ranges ON (test_ranges.loinc_num = loinc.loinc_num)' +
                '  LEFT OUTER JOIN loinc_extra ON (loinc_extra.loinc_num = loinc.loinc_num)' +
                ' WHERE test_orders.entity_type_id = 3' +
                ' UNION ALL ' +
                'SELECT panel_name AS "panName", panels.panel_id AS "panId", entity_types.entity_type_id AS "etId",' +
                '       entity_type_name AS "entityType", entity_type_name AS "entityName", spec_name AS specialty,' +
                '       order_val AS order, hide, loinc.loinc_num AS loinc, snomed_cid AS cid, flag, fac_type_name AS "facType",' +
                '       gender, min_age AS "minAge", max_age AS "maxAge", low_val AS "lowVal", high_val AS "highVal", units,' +
                '       shortname AS "testName", preferred_name AS "prefName"' +
                '  FROM sections' +
                '  JOIN panels ON (panels.sec_id = sections.sec_id)' +
                '  JOIN test_orders ON (test_orders.panel_id = panels.panel_id)' +
                '  JOIN tests_problems ON (tests_problems.panel_id = panels.panel_id AND tests_problems.tp_id = test_orders.tp_id)' +
                '  JOIN entity_types ON (entity_types.entity_type_id = test_orders.entity_type_id)' +
                '  JOIN specialties ON (specialties.spec_id = test_orders.spec_id AND specialties.spec_id = tests_problems.spec_id)' +
                '  JOIN facility_types ON (facility_types.fac_type_id = tests_problems.fac_type_id)' +
                '  JOIN loinc ON (loinc.loinc_num = tests_problems.loinc_num)' +
                '  JOIN test_ranges ON (test_ranges.loinc_num = loinc.loinc_num)' +
                '  LEFT OUTER JOIN loinc_extra ON (loinc_extra.loinc_num = loinc.loinc_num)' +
                ' WHERE test_orders.entity_type_id IN (2, 1)';

        util.dbQuery(connString, req, res, q, null,
            function (result) {
                if (result.rowCount > 0) {
                    util.sendJson(req, res, result.rows);
                } else {
                    util.sendJson(req, res, []);
                }
            });

        return next();
    }
};

// The 'create test orderset' call (POST /test/orderset/create)
module.exports.createTestOrderset = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Create/update a test display sequence.',
                post:   [{name: 'tests', desc: 'the JSON array of test info (in display sequence, hide values are <i>true/false</i>): ' +
                                    '[{assocId:assocId1, hide:testHide1}, ... ]'},
                         {name: 'panelId', desc: 'the id of the containing panel'},
                         {name: 'entityType', desc: 'the type of entity (user, group, location, organization, community, seed) setting the sequence'},
                         {name: 'entityId', desc: 'the id of the entity (use 0 for community, seed)'},
                         {name: 'specId', desc: 'the specialty id'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        // Check for valid entityType
        var entityTypeInfo = entityTypes[req.params.entityType];
        if (entityTypeInfo == undefined) {
            util.sendText(req, res, 400, 'Invalid entityType: ' + req.params.entityType);
            return next();
        }

        // First, delete any prior orderset (TODO: This should be in a transaction)
        var q = 'DELETE FROM test_orders WHERE panel_id = $1 AND entity_type_id = $2 AND entity_id = $3 AND spec_id = $4';

        util.dbQuery(connString, req, res, q, [req.params.panelId, entityTypeInfo.id, req.params.entityId, req.params.specId],
            function (result) {
                // Now, create the new orderset
                var tests = [];
                try {
                    tests = JSON.parse(req.params.tests);
                } catch (e) {
                    util.sendText(req, res, 400, 'Invalid JSON: ' + req.params.tests);
                    return;
                }

                var valSet = [];
                tests.forEach(function (thisTest, testNum) {
                    var orderVal = entityTypeInfo.orderBase + testNum;
                    valSet.push('(' + req.params.panelId + ',' + thisTest.assocId + ',' + entityTypeInfo.id + ',' +
                        req.params.entityId + ',' + req.params.specId + ',' + orderVal + ',' + thisTest.hide + ')');
                });

                var q = 'INSERT INTO test_orders (panel_id, tp_id, entity_type_id, entity_id, spec_id, order_val, hide) VALUES ' + valSet.join(',');

                util.dbQuery(connString, req, res, q, null,
                    function (result) {
                        if (result.rowCount > 0) {
                            util.sendText(req, res, 200, 'OK');
                        } else {
                            util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                        }
                    });
            });

        return next();
    }
};

// The 'delete test orderset' call (POST /test/orderset/delete/:forPanelId)
module.exports.deleteTestOrderset = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Delete the test ordering for panel :forPanelId.',
                params: [{name: 'forPanelId', desc: 'the panel id'}],
                post:   [{name: 'entityType', desc: 'the type of entity (user, group, location, organization, community, seed) that set the sequence'},
                         {name: 'entityId', desc: 'the id of the entity (use 0 for community, seed)'},
                         {name: 'specId', desc: 'the specialty id'}],
                return: "'OK'",
                error:  '400 if unsuccessful (not found).'};
    } else {
        // Check for valid entityType
        var entityTypeInfo = entityTypes[req.params.entityType];
        if (entityTypeInfo == undefined) {
            util.sendText(req, res, 400, 'Invalid entityType: ' + req.params.entityType);
            return next();
        }

        var q = 'DELETE FROM test_orders WHERE panel_id = $1 AND entity_type_id = $2 AND entity_id = $3 AND spec_id = $4';

        util.dbQuery(connString, req, res, q, [req.params.forPanelId, entityTypeInfo.id, req.params.entityId, req.params.specId],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendText(req, res, 200, 'OK');
                } else {
                    util.sendText(req, res, 400, 'Not found: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'check tests' call (POST /test/check)
module.exports.checkTests = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        // TODO: Can't put single/double quotes in post desc.
        return {desc:   'Evaluate a set of tests for abnormal results, out of date, missing tests and generate relevant messages.',
                post:   [{name: 'dsData', desc: 'Sections/Panels/Tests JSON array, augmented with hasData (true/false) and ' +
                                                'data (an array of two recent tests: hashes of date, shortdate, value, flag)'}],
                return: 'A JSON array of messages for each panel:<br>' +
                        '<div style="margin-left:30px;">[{panelName:panelName1, dsMessages:[{messageType:messageType1, action:actionMsg1, reason:reasonMsg1, note:noteMsg1}, ...]},<br>' +
                        '<span style="margin-left:8px;">{panelName:panelName2, dsMessages:[{messageType:messageType1, action:actionMsg1, reason:reasonMsg1, note:noteMsg1}, ...]}, ...]</span></div>' +
                        'where "messageType" can be "periodicTestDue", "abnormalValue", or "missingTest".',
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        // Check incoming JSON
        var dsData;
        try {
            dsData = JSON.parse(req.params.dsData);
        } catch (e) {
            util.sendText(req, res, 400, 'Invalid JSON: ' + req.params.dsData);
            return;
        }

        var now = new Date();
        var answer = [];
        // Evaluate each panel
        dsData.forEach(function (thisPanel) {
            // Select tests with associated data
            var tests = thisPanel.tests.filter(function (thisTest) { return thisTest.hasData; });
            // Evaluate each test
            tests.forEach(function (thisTest) {
                evalTest(answer, thisPanel.panelName, thisTest, now);
            });
        });

        util.sendJson(req, res, answer);

        return next();
    }
};

function evalTest(answer, panelName, test, now) {
    var messages = [];
    // Check for out of date (greater than six months ago)
    var testDate = new Date(test.data[0].date);
    var elapsed = testDate.getDaysBetween(now);
    if (elapsed > 182) {
        messages.push({messageType:'periodicTestDue',
                       action:'Consider checking ' + test.testName + ' today.',
                       reason:test.testName + ' has not been checked in six months.',
                       note:test.testName + ' was last tested on ' + test.data[0].date});
    }
    // Check for abnormal results (out of range)
    var testValue = parseFloat(test.data[0].value);
    if (testValue < parseFloat(test.testMin) || testValue > parseFloat(test.testMax)) {
        messages.push({messageType:'abnormalValue',
                       reason:test.testName + ' is abnormal (value: ' + test.data[0].value + test.testUnits +
                              ', normal range: ' + test.range + test.testUnits + ')',
                       note:test.testName + ' was last tested on ' + test.data[0].date});
    }
    // If any messages, stick into answer
    if (messages.length > 0) {
        var found = answer.some(function (answerElt) {
            if (answerElt.panelName == panelName) {
                // Add to existing element in answer
                answerElt.dsMessages = answerElt.dsMessages.concat(messages);
                return true;
            } else {
                return false;
            }
        });
        if (!found) {
            // Create new element in answer
            answer.push({panelName:panelName, dsMessages:messages});
        }
    }
}

//---------------------------------------------------------------------------------

// Initialize the set of sections
function setupSections () {
    reloadSections(function () {
        // Check whether all queries have completed
        if (util.setReady(isReady, 'sections')) {
            // Send module 'ready' event to parent
            module.exports.emit('ready');
        }
    })
}

// Reload the set of sections
function reloadSections (callback) {
    var q = 'SELECT sec_name AS name, sec_id AS id FROM sections';
    util.dbQuery(connString, null, null, q, null,
        function (result) {
            var tempSections = {};
            result.rows.forEach(function (thisRow) {
                tempSections[thisRow.name] = thisRow.id;
            });

            // Atomic replace
            sections = tempSections;

            // Send complete notification
            if (callback != undefined) {
                callback();
            }
        });
}

// Initialize the set of panels
function setupPanels () {
    reloadPanels(function () {
        // Check whether all queries have completed
        if (util.setReady(isReady, 'panels')) {
            // Send module 'ready' event to parent
            module.exports.emit('ready');
        }
    })
}

// Reload the set of panels
function reloadPanels (callback) {
    var q = 'SELECT sec_name AS "secName", panel_id AS id, panel_name AS name, graphable' +
            '  FROM sections, panels' +
            ' WHERE sections.sec_id = panels.sec_id';
    util.dbQuery(connString, null, null, q, null,
        function (result) {
            // Group results by secName (deleting secName at the same time)
            var tempPanels = util.groupBy(result.rows, function (thisRow) {
                var name = thisRow.secName;
                delete thisRow.secName;
                return name;
            });

            // Atomic replace
            panels = tempPanels;

            // Send complete notification
            if (callback != undefined) {
                callback();
            }
        });
}


// Initialize the set of entity types
function setupEntityTypes () {
    reloadEntityTypes(function () {
        // Check whether all queries have completed
        if (util.setReady(isReady, 'entityTypes')) {
            // Send module 'ready' event to parent
            module.exports.emit('ready');
        }
    })
}

// Reload the set of entity types
function reloadEntityTypes (callback) {
    var q = 'SELECT entity_type_name AS name, entity_type_id as id, entity_type_order_base AS "orderBase" FROM entity_types';
    util.dbQuery(connString, null, null, q, null,
        function (result) {
            var tempEntityTypes = {};
            result.rows.forEach(function (thisRow) {
                tempEntityTypes[thisRow.name] = {id:thisRow.id, orderBase:thisRow.orderBase};
            });

            // Atomic replace
            entityTypes = tempEntityTypes;

            // Send complete notification
            if (callback != undefined) {
                callback();
            }
        });
}

// Initialize the set of specialties
function setupSpecialties () {
     reloadSpecialties(function () {
         // Check whether all queries have completed
         if (util.setReady(isReady, 'specialties')) {
             // Send module 'ready' event to parent
             module.exports.emit('ready');
         }
     })
}

// Reload the set of specialties
function reloadSpecialties (callback) {
    var q = 'SELECT spec_id AS id, spec_name as name FROM specialties';
    util.dbQuery(connString, null, null, q, null,
        function (result) {
            specialties = result.rows;

            // Send complete notification
            if (callback != undefined) {
                callback();
            }
        });
}


