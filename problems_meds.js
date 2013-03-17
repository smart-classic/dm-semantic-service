'use strict';

// SMART problems_meds web service
// File: problems_meds.js
var version = '20130312';

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
util.setNotReady(isReady, 'problemsMedsSources');

// Initialize globals
var problemsMedsSources = [];
setupProblemsMedsSources();

// The 'problems_meds sources' call (GET /problems_meds/sources)
module.exports.problemsMedsSources = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {pre:    {desc: 'problems_meds service', version: version},
                desc: 'Get available sources for problems-meds associations',
                return: 'A JSON array of source names and ids:<div style="margin-left:30px;">' + JSON.stringify(problemsMedsSources) + '</div>'};
    } else {
        util.sendJson(req, res, problemsMedsSources);
        return next();
    }
};

// The 'problems_meds with sources' call (POST /problems_meds/with_sources)
module.exports.problemsMedsWithSources = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get an array of objects for associated problems (CID) and meds (RxCui) from specified sources.',
                post: [{name: 'sources', desc: 'The array of source ids.'},
                       {name: 'meds', desc: 'The array of RxCui values to find associated CIDs for.'}],
                return: 'A JSON array of objects each consisting of an array of source ids (sourceIds), and an associated problem (CID) and med (RxCui).',
                error:  '400 if post data are not a JSON arrays.'};
    } else {
        var sources = [];
        try {
            sources = JSON.parse(req.params.sources);
        } catch (e) {
            util.sendText(req, res, 400, 'Invalid JSON: ' + req.params.sources);
            return next();
        }

        var meds = [];
        try {
            meds = JSON.parse(req.params.meds);
        } catch (e) {
            util.sendText(req, res, 400, 'Invalid JSON: ' + req.params.meds);
            return next();
        }

        // Make sure post data are JSON arrays
        if (util.typeOf(sources) != 'Array' ||
            util.typeOf(meds) != 'Array') {
            util.sendText(req, res, 400, 'Invalid inputs (not an array): ' + JSON.stringify(req.params));
            return next();
        }

        var q = 'SELECT rxcui AS "RxCui", cid AS "CID", source_id AS "sourceId"' +
                '  FROM problems_meds' +
                ' WHERE rxcui IN ' + util.placeHolderList(meds.length) +
                '   AND source_id IN ' + util.placeHolderList(sources.length, meds.length) +
                ' ORDER BY rxcui, cid';

        util.dbQuery(connString, req, res, q, meds.concat(sources),
            function (result) {
                // Collect RxCui + CID pairs with associated sourceIds
                var ans = [];
                var currRxCui, currCID, currIds;
                result.rows.forEach(function (thisRow) {
                   if (currRxCui == undefined) {
                       // First row
                       currRxCui = thisRow.RxCui;
                       currCID = thisRow.CID;
                       currIds = [thisRow.sourceId];
                   } else if (thisRow.RxCui != currRxCui || thisRow.CID != currCID) {
                       // New group
                       ans.push({sourceIds:currIds, RxCui:currRxCui, CID:currCID});
                       currRxCui = thisRow.RxCui;
                       currCID = thisRow.CID;
                       currIds = [thisRow.sourceId];
                   } else {
                       // Continue current group
                       currIds.push(thisRow.sourceId);
                   }
                });
                if (result.rowCount > 0) {
                    // Final group
                    ans.push({sourceIds:currIds, RxCui:currRxCui, CID:currCID});
                }

                util.sendJson(req, res, ans);
            });

        return next();
    }
};

// The 'problems_meds' call (POST /problems_meds)
module.exports.problemsMeds = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get an array of objects for <i>demo</i> associated problems (CID) and meds (RxCui).',
                post:   'A JSON array of RxCui values.',
                return: 'A JSON array of objects each containing an associated problem (CID) and med (RxCui).',
                error:  '400 if post data is not a JSON array.'};
    } else {
        var meds = req.params;

        // Make sure post data is a JSON array
        if (util.typeOf(meds) != 'Array') {
            util.sendText(req, res, 400, 'Invalid input (not an array): ' + JSON.stringify(meds));
            return next();
        }

        var q = 'SELECT rxcui AS "RxCui", cid AS "CID" ' +
                  'FROM problems_meds WHERE source_id = 1 AND rxcui IN ' + util.placeHolderList(meds.length);

        util.dbQuery(connString, req, res, q, meds,
            function (result) {
                req.log.info({req: req}, 'meds: ' + meds);
                util.sendJson(req, res, {result: result.rows});
            });

        return next();
    }
};

// The 'problems' call (POST /problems_meds/problems)
module.exports.problems = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get an array of objects describing a set of problems.',
                post:   'A JSON array of CID values.',
                return: 'A JSON array of objects each containing cid, fsn, status, isRetired, replacedBy.',
                error:  '400 if post data is not a JSON array.' };
    } else {
        var problems = req.params;

        // Make sure post data is a JSON array
        if (util.typeOf(problems) != 'Array') {
            util.sendText(req, res, 400, 'Invalid input (not an array): ' + JSON.stringify(problems));
            return next();
        }

        var q = 'SELECT snomed_cid AS cid, snomed_fsn AS fsn, snomed_concept_status AS status, ' +
		               'is_retired_from_subset AS "isRetired", replaced_by_snomed_cid AS "replacedBy" ' +
	              'FROM snomedct_core_subset_201208 WHERE snomed_cid IN ' + util.placeHolderList(problems.length);

        util.dbQuery(connString, req, res, q, problems,
            function (result) {
                req.log.info({req: req}, 'problems: ' + problems);
                util.sendJson(req, res, {result: result.rows});
            });

        return next();
    }
};

// The 'meds' call (POST /problems_meds/meds)
module.exports.meds = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'Get an array of objects describing a set of medications.',
                post:   'A JSON array of RxCui values.',
                return: 'A JSON array of objects each containing RxCui, FullName, ' +
                        'DoseForm, Strength, StrengthAndDoseForm, DisplayNameSynonym.',
                error:  '400 if post data is not a JSON array.'};
    } else {
        var meds = req.params;

        // Make sure post data is a JSON array
        if (util.typeOf(meds) != 'Array') {
            util.sendText(req, res, 400, 'Invalid input (not an array): ' + JSON.stringify(meds));
            return next();
        }

        var q = 'SELECT rxcui AS "RxCui", full_name AS "FullName", ' +
                       'rxn_dose_form AS "DoseForm", strength AS "Strength", ' +
                       "strength || ' ' || rxn_dose_form AS \"StrengthAndDoseForm\", " +
                       "split_part(display_name, '(', 1) AS \"DisplayNameSynonym\" " +
                  'FROM rxterms WHERE rxcui IN ' + util.placeHolderList(meds.length);

        util.dbQuery(connString, req, res, q, meds,
             function (result) {
                 req.log.info({req: req}, 'meds: ' + meds);
                 util.sendJson(req, res, {result: result.rows});
             });

        return next();
    }
};

//---------------------------------------------------------------------------------

// Initialize the set of problems_meds sources
function setupProblemsMedsSources () {
    var q = 'SELECT source_id AS id, source_desc AS desc FROM problems_meds_sources';

    util.dbQuery(connString, null, null, q, null,
        function (result) {
            problemsMedsSources = result.rows;

            // Check whether all queries have completed
            if (util.setReady(isReady, 'problemsMedsSources')) {
                // Send module 'ready' event to parent
                module.exports.emit('ready');
            }
        }
    )
}

