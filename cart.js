'use strict';

// SMART cart web service
// File: cart.js
var version = '20130222';

// Required modules
var EventEmitter = require('events').EventEmitter;
var util = require('./utility');

// Configuration
var config = require('./config');

var connString =
    'pg://' + config.dbCred + '@localhost/org_smartplatforms_semantic_cart' + config.dbDeploySuffix;

// Setup for 'ready' event
module.exports = new EventEmitter();

// The 'isReady' structure to track when this module is fully setup
var isReady = {};
util.setNotReady(isReady, 'sectionActions');

// Initialize globals
var sectionActions = {};
setupSectionActions();

// The 'actions for section' call (GET /cart/actions/:forSectionName)
module.exports.getActions = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {pre:    {desc: 'cart service', version: version},
                desc:   'Get an array of actions supported for section :forSectionName.',
                params: [{name: 'forSectionName', desc: 'the section'}],
                return: 'A JSON array of action names.',
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        if (sectionActions.hasOwnProperty(req.params.forSectionName)) {
            util.sendJson(req, res, sectionActions[req.params.forSectionName]);
        } else {
            util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params))
        }
        return next();
    }
};

// The 'submit item' call (POST /cart/submit)
module.exports.submit = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Add a new item to the cart.',
                post:   [{name: 'text', desc: 'the cart item text entry'},
                         {name: 'patient', desc: 'the patient identifier'},
                         {name: 'hypothetical', desc: '<i>true</i> for a what-if entry, else <i>false</i>'},
                         {name: 'appItemId', desc: 'a UI element ID tied to this item'},
                         {name: 'accountId', desc: 'the user identifier'},
                         {name: 'secName', desc: 'the section of this cart item'},
                         {name: 'actName', desc: 'the action for this cart item'}],
                return: 'The itemId.',
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'INSERT INTO cart_items (text, patient, hypothetical, app_item_id, created_by, created_ts, sec_name, act_id)' +
                '     SELECT $1, $2, $3, $4, $5, NOW(), $6, act_id' +
                '       FROM actions' +
                '      WHERE act_name = $7' +
                '  RETURNING item_id AS "itemId"';

        util.dbQuery(connString, req, res, q, [req.params.text, req.params.patient, req.params.hypothetical, req.params.appItemId,
                                               req.params.accountId, req.params.secName, req.params.actName],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendText(req, res, 200, result.rows[0].itemId)
                } else {
                    util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params))
                }
            });

        return next();
    }
};

// The 'edit item' call (POST /cart/edit/:itemId)
module.exports.edit = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Edit an item (:itemId) in the cart.',
                params: [{name: 'itemId', desc: 'the item id'}],
                post:   [{name: 'text', desc: 'the cart item text entry'},
                         {name: 'hypothetical', desc: '<i>true</i> for a what-if entry, else <i>false</i>'},
                         {name: 'accountId', desc: 'the user identifier'},
                         {name: 'actName', desc: 'the action for this cart item'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        // :itemId
        // Currently allows committed and processed items to be edited.
        var q = 'UPDATE cart_items' +
                '   SET text = $1, act_id = sub.act_id, hypothetical = $2, edited_by = $3, edited_ts = NOW()' +
                '  FROM (SELECT act_id FROM actions' +
                '         WHERE act_name = $4) AS sub' +
                ' WHERE item_id = $5';

        util.dbQuery(connString, req, res, q, [req.params.text, req.params.hypothetical, req.params.accountId,
                                               req.params.actName, req.params.itemId],
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

// The 'cart count' call (GET /cart/count/:forAccountId)
module.exports.getCount = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get the count of items in the cart for user :forAccountId.',
                params: [{name: 'forAccountId', desc: 'the account id'}],
                return: 'the item count'};
    } else {
        var q = 'SELECT COUNT(*) AS count FROM items WHERE created_by = $1 AND NOT committed';

        util.dbQuery(connString, req, res, q, [req.params.forAccountId],
            function (result) {
                util.sendText(req, res, 200, result.rows[0].count);
            });

        return next();
    }
};

// The 'cart contents' call (GET /cart/contents/:forAccountId)
module.exports.getContents = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get the contents of the cart for user :forAccountId.',
                params: [{name: 'forAccountId', desc: 'the account id'}],
                return: 'Items in the cart, grouped by patient:' +
                        '<div style="margin-left:30px;">{patient1: [{item1-props}, {item2-props}, ...],<br>' +
                        '{patient2: [{item1-props}, {item2-props}, ...], ...</div>' +
                        'where item-props = itemId, secName, actName, text, patient, hypothetical'};
    } else {
        var q = 'SELECT item_id AS "itemId", sec_name AS "secName", act_name AS "actName", text, patient, hypothetical' +
                '  FROM cart_items, actions' +
                ' WHERE cart_items.act_id = actions.act_id' +
                '   AND created_by = $1 AND NOT committed';

        util.dbQuery(connString, req, res, q, [req.params.forAccountId],
            function (result) {
                util.sendJson(req, res, util.groupBy(result.rows, function (row) { return row.patient; }));
            });

        return next();
    }
};

// The 'cart history' call (GET /cart/history/:forAccountId/:startDate/:endDate)
module.exports.getHistory = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get the committed contents of the cart for user :forAccountId from :startDate to :endDate.',
                params: [{name: 'forAccountId', desc: 'the user id'},
                         {name: 'startDate', desc: 'the start date'},
                         {name: 'endDate', desc: 'the end date'}],
                return: 'Items in the cart, grouped by patient:' +
                        '<div style="margin-left:30px;">{patient1: [{item1-props}, {item2-props}, ...],<br>' +
                        '{patient2: [{item1-props}, {item2-props}, ...], ...</div>' +
                        'where item-props = itemId, secName, actName, text, hypothetical, patient'};
    } else {
        var q = 'SELECT item_id AS "itemId", sec_name AS "secName", act_name AS "actName", text, hypothetical, patient' +
            '  FROM cart_items, actions' +
            ' WHERE cart_items.act_id = actions.act_id' +
            '   AND created_by = $1 AND committed' +
            '   AND created_ts >= $2' +
            '   AND created_ts <= $3';

        util.dbQuery(connString, req, res, q, [req.params.forAccountId, req.params.startDate, req.params.endDate],
            function (result) {
                util.sendJson(req, res, util.groupBy(result.rows, function (row) { return row.patient; }));
            });

        return next();
    }
};

// The 'cart pending' call (GET /cart/pending/:forPatient)
module.exports.getPending = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get the contents of all carts (pending, uncommitted) for patient :forPatient.',
                params: [{name: 'forPatient', desc: 'the patient'}],
                return: 'Items in the cart, grouped by "createdBy":' +
                        '<div style="margin-left:30px;">{createdBy1: [{item1-props}, {item2-props}, ...],<br>' +
                        '{createdBy2: [{item1-props}, {item2-props}, ...], ...</div>' +
                        'where item-props = itemId, secName, actName, text, hypothetical, createdBy, appItemId'};
    } else {
        var q = 'SELECT item_id AS "itemId", sec_name AS "secName", act_name AS "actName", text, ' +
            '           hypothetical, created_by AS "createdBy, app_item_id AS "appItemId"' +
            '  FROM cart_items, actions' +
            ' WHERE cart_items.act_id = actions.act_id' +
            '   AND patient = $1 AND NOT committed';

        util.dbQuery(connString, req, res, q, [req.params.forPatient],
            function (result) {
                util.sendJson(req, res, util.groupBy(result.rows, function (row) { return row.createdBy; }));
            });

        return next();
    }
};

// The 'delete item' call (POST /cart/delete/:itemId/:byAccountId)
module.exports.delete = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Change the state of cart item :itemId to "deleted", marking it deleted by user :byAccountId.',
                params: [{name: 'itemId', desc: 'the cart item id'},
                         {name: 'byAccountId', desc: 'the id of the deleting user'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'UPDATE cart_items SET deleted = TRUE, deleted_ts = NOW(), deleted_by = $2' +
                ' WHERE item_id = $1 AND NOT committed';

        util.dbQuery(connString, req, res, q, [req.params.itemId, req.params.byAccountId],
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

// The 'commit' call (POST /cart/commit/:byAccountId/:forAccountId or POST /cart/commit/:byAccountId/:forAccountId/:forPatient)
module.exports.commit = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Change the state of cart items to "committed" for user :forAccountId,' +
                        'marking them committed by user :byAccountId.<br>' +
                        'Restrict to a single patient (:forPatient) if specified.',
                params: [{name: 'byAccountId', desc: 'the id of the committing user'},
                         {name: 'forAccountId', desc: 'the id of the user who created the cart items'},
                         {name: 'forPatient', desc: 'return only items for this patient (if specified)'}],
                return: "'OK'",
                error:  '400 if unsuccessful.'};
    } else {
        var q = 'UPDATE cart_items SET committed = TRUE, committed_ts = NOW(), committed_by = $1' +
                ' WHERE created_by = $2 AND NOT committed';

        // Restrict to single patient if specified
        if (req.params.forPatient != undefined) {
            q += ' AND patient = $3';
        }

        util.dbQuery(connString, req, res, q, [req.params.byAccountId, req.params.forAccountId, req.params.forPatient],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendText(req, res, 200, 'OK');
                } else {
                    util.sendText(req, res, 400, 'Commit error.');
                }
            });

        return next();
    }
};


//---------------------------------------------------------------------------------

// Initialize the set of valid actions for each section
function setupSectionActions () {
    reloadSectionActions(function () {
        // Check whether all queries have completed
        if (util.setReady(isReady, 'sectionActions')) {
            // Send module 'ready' event to parent
            module.exports.emit('ready');
        }
    })
}

// Reload the set of valid actions for each section
function reloadSectionActions (callback) {
    var q = 'SELECT sec_name, act_name FROM section_actions';
    util.dbQuery(connString, null, null, q, null,
        function (result) {
            var tempSectionActions = {};
            for (var i = 0; i < result.rowCount; i++) {
                var row = result.rows[i];
                if (tempSectionActions[row.sec_name] == undefined) {
                    // Create the new section
                    tempSectionActions[row.sec_name] = [];
                }
                tempSectionActions[row.sec_name].push(row.act_name);
            }
            // Atomic replace
            sectionActions = tempSectionActions;

            // Send complete notification
            if (callback != undefined) {
                callback();
            }
        });
}
