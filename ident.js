'use strict';

// SMART identity web service
// File: ident.js
var version = '20130124';

// Required modules
var EventEmitter = require('events').EventEmitter;
var util = require('./utility');

// Configuration
var config = require('./config');

var connString =
    'pg://' + config.dbCred + '@localhost/org_smartplatforms_semantic_diverse' + config.dbDeploySuffix;

// Setup for 'ready' event
module.exports = new EventEmitter();

// The 'isReady' structure to track when this module is fully setup
var isReady = {};
util.setNotReady(isReady, 'facilityTypes');

// Initialize globals
var facilityTypes = [];
setupFacilityTypes();


// The 'get facility types' call (GET /facility_types)
module.exports.getFacilityTypes = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {pre:    {desc: 'ident service', version: version},
                desc:   'Get supported facility types.',
                return: 'The JSON array of facility types names and ids:<div style="margin-left:30px;">' + JSON.stringify(facilityTypes) + '</div>'};
    } else {
        util.sendJson(req, res, facilityTypes);
        return next();
    }
};

// The 'create facility type' call (POST /facility_type/create)
module.exports.createFacilityType = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Create a new facility type.',
                post:   [{name: 'name', desc: 'the facility type name'}],
                return: 'The facTypeId.',
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'INSERT INTO facility_types (fac_type_name) VALUES ($1) RETURNING fac_type_id';

        util.dbQuery(connString, req, res, q, [req.params.name],
            function (result) {
                if (result.rowCount > 0) {
                    reloadFacilityTypes(function () {
                        util.sendText(req, res, 200, result.rows[0].fac_type_id);
                    });
                } else {
                    util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'edit facility type' call (POST /facility_type/edit/:facTypeId)
module.exports.editFacilityType = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Edit the facility type :facTypeId.',
                params: [{name: 'facTypeId', desc: 'the facility type id'}],
                post:   [{name: 'name', desc: 'the new facility type name'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'UPDATE facility_types SET fac_type_name = $1 WHERE fac_type_id = $2';

        util.dbQuery(connString, req, res, q, [req.params.name, req.params.facTypeId],
            function (result) {
                if (result.rowCount > 0) {
                    reloadFacilityTypes(function () {
                        util.sendText(req, res, 200, 'OK');
                    });
                } else {
                    util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'delete facility type' call (POST /facility_type/delete/:facTypeId)
module.exports.deleteFacilityType = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Delete the facility type :facTypeId.',
                params: [{name: 'facTypeId', desc: 'the facility type id'}],
                return: "'OK'",
                error:  '400 if unsuccessful (not found).'};
    } else {
        var q = 'DELETE FROM facility_types WHERE fac_type_id = $1';

        util.dbQuery(connString, req, res, q, [req.params.facTypeId],
            function (result) {
                if (result.rowCount > 0) {
                    reloadFacilityTypes(function () {
                        util.sendText(req, res, 200, 'OK');
                    });
                } else {
                    util.sendText(req, res, 400, 'Not found: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'create org' call (POST /ident/org/create)
module.exports.createOrg = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {pre:    '<hr style="margin-top:25px;">',
                desc:   'Create a new org.',
                post:   [{name: 'name', desc: 'the organization name'}],
                return: 'The orgId.',
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'INSERT INTO organizations (org_name) VALUES ($1) RETURNING org_id';

        util.dbQuery(connString, req, res, q, [req.params.name],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendText(req, res, 200, result.rows[0].org_id);
                } else {
                    util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'edit org' call (POST /ident/org/edit/:orgId)
//server.post('/ident/org/edit/:orgId', ident.editOrg);
module.exports.editOrg = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Edit the org :orgId.',
                params: [{name: 'orgId', desc: 'the org id'}],
                post:   [{name: 'name', desc: 'the new name'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'UPDATE organizations SET org_name = $1 WHERE org_id = $2';

        util.dbQuery(connString, req, res, q, [req.params.name, req.params.orgId],
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

// The 'delete org' call (POST /ident/org/delete/:orgId)
module.exports.deleteOrg = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Delete the org :orgId.',
                params: [{name: 'orgId', desc: 'the org id'}],
                return: "'OK'",
                error:  '400 if unsuccessful (not found).'};
    } else {
        var q = 'DELETE FROM organizations WHERE org_id = $1';

        util.dbQuery(connString, req, res, q, [req.params.orgId],
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

// The 'get orgs' call (GET /ident/orgs)
module.exports.getOrgs = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get defined orgs.',
                return: 'A JSON array of organizations:' +
                        '<div style="margin-left:30px;">[{name:orgName1, id:orgId1}, {name:orgName2, id:orgId2}, ...]</div>'};
    } else {
        var q = 'SELECT org_name AS name, org_id AS id FROM organizations';

        util.dbQuery(connString, req, res, q, null,
            function (result) {
                util.sendJson(req, res, result.rows);
            });

        return next();
    }
};

// The 'search for orgs' call (GET /ident/orgs/find/:searchFor)
module.exports.searchForOrgs = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Search for any orgs whose name contains the search string :searchFor.',
                params: [{name: 'searchFor', desc:'the search string'}],
                return: 'A JSON array of matching organizations:' +
                        '<div style="margin-left:30px;">[{name:orgName1, id:orgId1}, {name:orgName2, id:orgId2}, ...]</div>'};
    } else {
        var q = 'SELECT org_name AS name, org_id AS id FROM organizations WHERE org_name ILIKE $1 LIMIT $2';

        util.dbQuery(connString, req, res, q, ['%' + req.params.searchFor + '%', config.dbLimitResults],
            function (result) {
                util.sendJson(req, res, result.rows);
            });

        return next();
    }
};

// The 'create loc' call (POST /ident/loc/create)
module.exports.createLoc = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {pre:    '<hr style="margin-top:25px;">',
                desc:   'Create a new loc.',
                post:   [{name: 'name', desc: 'the location name'},
                         {name: 'orgId', desc: 'the associated organization'},
                         {name: 'facType', desc: 'the facility type name'}],
                return: 'the locId.',
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'INSERT INTO locations (org_id, loc_name, fac_type_id)' +
                '     SELECT $1, $2, fac_type_id FROM facility_types' +
                '      WHERE fac_type_name = $3' +
                ' RETURNING loc_id';

        util.dbQuery(connString, req, res, q, [req.params.orgId, req.params.name, req.params.facType],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendText(req, res, 200, result.rows[0].loc_id);
                } else {
                    util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'edit loc' call (POST /ident/loc/edit/:locId)
module.exports.editLoc = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Edit the loc :locId.',
                params: [{name: 'locId', desc: 'the loc id'}],
                post:   [{name: 'name', desc: 'the new name'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'UPDATE locations SET loc_name = $1 WHERE loc_id = $2';

        util.dbQuery(connString, req, res, q, [req.params.name, req.params.locId],
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

// The 'delete loc' call (POST /ident/loc/delete/:locId)
module.exports.deleteLoc = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Delete the loc :locId.',
                params: [{name: 'locId', desc: 'the loc id'}],
                return: "'OK'",
                error:  '400 if unsuccessful (not found).'};
    } else {
        var q = 'DELETE FROM locations WHERE loc_id = $1';

        util.dbQuery(connString, req, res, q, [req.params.locId],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendText(req, res,200, 'OK');
                } else {
                    util.sendText(req, res, 400, 'Not found: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'get locs for org' call (GET /ident/locs/:forOrgId)
module.exports.getLocsForOrg = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Find locs for org :forOrgId',
                params:  [{name: 'forOrgId', desc: 'the org id'}],
                return: 'A JSON array of locations:' +
                        '<div style="margin-left:30px;">[{name:locName1, id:locId1}, {name:locName2, id:locId2}, ...]</div>'};
    } else {
        var q = 'SELECT loc_name AS name, loc_id AS id FROM locations WHERE org_id = $1';

        util.dbQuery(connString, req, res, q, [req.params.forOrgId],
            function (result) {
                util.sendJson(req, res, result.rows);
            });

        return next();
    }
};

// The 'create group' call (POST /ident/group/create)
module.exports.createGroup = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {pre:    '<hr style="margin-top:25px;">',
                desc:   'Create a new group.',
                post:   [{name: 'name', desc: 'the group name'},
                         {name: 'locId', desc: 'the associated location'}],
                return: 'the groupId.',
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'INSERT INTO groups (loc_id, org_id, fac_type_id, group_name)' +
                '     SELECT $1, org_id, fac_type_id, $2 FROM locations' +
                '      WHERE loc_id = $1' +
                '  RETURNING group_id';

        util.dbQuery(connString, req, res, q, [req.params.locId, req.params.name],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendText(req, res, 200, result.rows[0].group_id);
                } else {
                    util.sendText(req, res, 400, 'Invalid input: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'edit group' call (POST /ident/group/edit/:groupId)
module.exports.editGroup = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Edit the group :groupId.',
                params: [{name: 'groupId', desc: 'the group id'}],
                post:   [{name: 'name', desc: 'the new name'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'UPDATE groups SET group_name = $1 WHERE group_id = $2';

        util.dbQuery(connString, req, res, q, [req.params.name, req.params.groupId],
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

// The 'delete group' call (POST /ident/group/delete/:groupId)
module.exports.deleteGroup = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Delete the group :groupId.',
                params: [{name: 'groupId', desc: 'the group id'}],
                return: "'OK'",
                error:  '400 if unsuccessful (not found).'};
    } else {
        var q = 'DELETE FROM groups WHERE group_id = $1';

        util.dbQuery(connString, req, res, q, [req.params.groupId],
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

// The 'get groups for loc' call (GET /ident/groups/:forLocId)
module.exports.getGroupsForLoc = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Find groups for loc :forLocId',
                params: [{name: 'forLocId', desc: 'the loc id'}],
                return: 'A JSON array of groups:' +
                        '<div style="margin-left:30px;">[{name:groupName1, id:groupId1}, {name:groupName2, id:groupId2}, ...]</div>'};
    } else {
        var q = 'SELECT group_name AS name, group_id AS id FROM groups WHERE loc_id = $1';

        util.dbQuery(connString, req, res, q, [req.params.forLocId],
            function (result) {
                util.sendJson(req, res, result.rows);
            });

        return next();
    }
};

// The 'get user' call (GET /ident/user/:accountId)
module.exports.getUser = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {pre:    '<hr style="margin-top:25px;">',
                desc:   'Get info for user :accountId',
                params: [{name: 'accountId', desc: 'the user id'}],
                return: 'A JSON hash of user info:' +
                        '<div style="margin-left:30px;">{name:userName, accountId:id, groupId:id, locId:id, orgId:id, facTypeId:id, specId:id}</div>',
                error:  '400 if unsuccessful (not found).'};
    } else {
        var q = 'SELECT user_name AS name, account_id AS "accountId", group_id AS "groupId",' +
                '       loc_id AS "locId", org_id AS "orgId", fac_type_id AS "facTypeId", spec_id AS "specId"' +
                '  FROM users' +
                ' WHERE account_id = $1';

        util.dbQuery(connString, req, res, q, [req.params.accountId],
            function (result) {
                if (result.rowCount > 0) {
                    util.sendJson(req, res, result.rows[0]);
                } else {
                    util.sendText(req, res, 400, 'Not found: ' + JSON.stringify(req.params));
                }
            });

        return next();
    }
};

// The 'create user' call (POST /ident/user/create/:accountId)
module.exports.createUser = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Create a new user based on SMART account :accountId.',
                params: [{name: 'accountId', desc: 'the SMART account id'}],
                post:   [{name: 'groupId', desc: 'the associated group'},
                         {name: 'specId', desc: 'the id of the default specialty for this user'},
                         {name: 'name', desc: 'the user name'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'INSERT INTO users (account_id, group_id, user_name, loc_id, org_id, fac_type_id, spec_id)' +
                '     SELECT $1, $2, $3, loc_id, org_id, fac_type_id, $4 FROM groups' +
                '      WHERE group_id = $2';

        util.dbQuery(connString, req, res, q, [req.params.accountId, req.params.groupId, req.params.name, req.params.specId],
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

// The 'edit user' call (POST /ident/user/edit/:accountId)
module.exports.editUser = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Edit the user :accountId.',
                params: [{name: 'accountId', desc: 'the account id'}],
                post:   [{name: 'name', desc: 'the new name'}],
                return: "'OK'",
                error:  '400 if unsuccessful (invalid input values).'};
    } else {
        var q = 'UPDATE users SET user_name = $1 WHERE account_id = $2';

        util.dbQuery(connString, req, res, q, [req.params.name, req.params.accountId],
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

// The 'delete user' call (POST /ident/user/delete/:accountId)
module.exports.deleteUser = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Delete the user :accountId.',
                params: [{name: 'accountId', desc: 'the account id'}],
                return: "'OK'",
                error:  '400 if unsuccessful (not found).'};
    } else {
        var q = 'DELETE FROM users WHERE account_id = $1';

        util.dbQuery(connString, req, res, q, [req.params.accountId],
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

// The 'get users for group' call (GET /ident/users/:forGroupId)
module.exports.getUsersForGroup = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Find users for group :forGroupId',
                params: [{name: 'forGroupId', desc: 'the group id'}],
                return: 'A JSON array of users:' +
                        '<div style="margin-left:30px;">[{name:userName1, id:accountId1}, {name:userName2, id:accountId2}, ...]</div>'};
    } else {
        var q = 'SELECT user_name AS name, account_id AS id FROM users WHERE group_id = $1';

        util.dbQuery(connString, req, res, q, [req.params.forGroupId],
            function (result) {
                util.sendJson(req, res, result.rows);
            });

        return next();
    }
};

// The 'search for user' call (GET /ident/users/find/:searchFor/:forOrgId)
module.exports.searchForUser = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Search for any users for org :forOrgId, whose name contains the search string :searchFor',
                params: [{name: 'searchFor', desc: 'the string to search for'},
                         {name: 'forOrgId', desc: 'the org id'}],
                return: 'A JSON array of users:' +
                        '<div style="padding-left:30px;">[{user:userName1, id:accountId1, group:groupName1, loc:locName1}<br>' +
                        '<span style="padding-left:6px;">{user:userName2, id:accountId2, group:groupName2, loc:locName2}, ...]</span></div>'};
    } else {
        var q = 'SELECT user_name AS user, account_id AS id, group_name as group, loc_name as loc' +
                '  FROM users, groups, locations' +
                ' WHERE users.group_id = groups.group_id' +
                '   AND users.loc_id = locations.loc_id' +
                '   AND user_name ILIKE $1 AND users.org_id = $2 LIMIT $3';

        util.dbQuery(connString, req, res, q, ['%' + req.params.searchFor + '%', req.params.forOrgId, config.dbLimitResults],
            function (result) {
                util.sendJson(req, res, result.rows);
            });

        return next();
    }
};


//---------------------------------------------------------------------------------

// Initialize the set of facility types
function setupFacilityTypes () {
    reloadFacilityTypes(function () {
        // Check whether all queries have completed
        if (util.setReady(isReady, 'facilityTypes')) {
            // Send module 'ready' event to parent
            module.exports.emit('ready');
        }
    })
}

// Reload the set of facility types
function reloadFacilityTypes(callback) {
    var q = 'SELECT fac_type_id AS id, fac_type_name as name FROM facility_types';
    util.dbQuery(connString, null, null, q, null,
        function (result) {
            facilityTypes = result.rows;

            // Send complete notification
            if (callback != undefined) {
                callback();
            }
        });
}
