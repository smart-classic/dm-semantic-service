'use strict';

// SMART de_ident web service
// File: de_ident.js
var version = '20130220';

// Required modules
var EventEmitter = require('events').EventEmitter;
var util = require('./utility');
require('date-utils');

// Configuration
var config = require('./config');

var DEFAULT_PURPOSE = 'redact_all';	// if no/invalid de_ident_purpose supplied
var HIDE_STRING = '•••••';		// replacement string for the 'hide' operation
var MASK_CHAR = 'X';			// replacement char for the 'mask' operation
var ERROR_STRING = '??????';		// replacement string on parsing errors

var connString =
      'pg://' + config.dbCred + '@localhost/org_smartplatforms_semantic_de_ident' + config.dbDeploySuffix;

// Setup for 'ready' event
module.exports = new EventEmitter();

// Initialize the 'isReady' structure to track when this module is fully setup
var isReady = {};
util.setNotReady(isReady, 'purposeOptions');
util.setNotReady(isReady, 'defaults');
util.setNotReady(isReady, 'attributes');

// Initialize globals
var purposeOptions = {};
var defaults = {};
var attributes = {};
setupPurposeOptions();
setupDefaults();
setupAttributes();

// The 'deIdentPurposes' call (GET /de_ident)
module.exports.deIdentPurposes = function (req, res, next) {
    // Collect defined purposes
    var purposes = [];
    for (var prop in purposeOptions) {
        if (purposeOptions.hasOwnProperty(prop)) {
            purposes.push(prop);
        }
    }

    if (req == undefined) {
        // Return documentation
        return {pre:    {desc: 'de_ident service', version: version},
                desc:   'Get the array of available de-ident purposes.',
                return: 'The JSON array of purposes:<div style="margin-left:30px;">' + JSON.stringify(purposes) + '</div>'};
    } else {
        util.sendJson(req, res, purposes);
        return next();
    }
};

// The 'deIdent' call (POST /de_ident or POST /de_ident/:urlDeIdentPurpose)
module.exports.deIdent = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {desc:   'De-identify a patient record. Specify the purpose either from the route (:urlDeIdentPurpose) or post parameter.',
                params: [{name: 'urlDeIdentPurpose', desc: 'the de-identify purpose (if specified)'}],
                post:   'The JSON patient record plus (optionally) the purpose (deIdentPurpose). The route-specified purpose takes precedence.',
                return: 'The JSON patient record with identifiable patient information de-identified based on the specified purpose.'};
    } else {
        var urlDeIdentPurpose = req.params.urlDeIdentPurpose;	// from URL
        var postDeIdentPurpose = req.params.deIdentPurpose;		// from patient info

        // Verify purpose -- purpose from URL takes precedence
        var requestedPurpose = (urlDeIdentPurpose != undefined) ? urlDeIdentPurpose : postDeIdentPurpose;
        if (requestedPurpose == undefined) {
            requestedPurpose = DEFAULT_PURPOSE;
        }

        // Set the actual deIdentPurpose to use
        req.params.deIdentPurpose = verifyPurpose(requestedPurpose);

        // Iterate over patient info and transform attribute values
        transformObject(req, null, null, req.params);

        // Remove 'urlDeIdentPurpose' to eliminate error on next submission
        delete req.params.urlDeIdentPurpose;

        // Set response (don't log the full results)
        req.log.info({req:req}, 'de_ident');
        res.header('Access-Control-Allow-Headers', 'content-type, x-requested-with');
        res.json({result:req.params});

        return next();
    }
};


//---------------------------------------------------------------------------------

// Initialize the set of valid purposes
function setupPurposeOptions () {
    reloadPurposeOptions(function () {
        // Check whether all queries have completed
        if (util.setReady(isReady, 'purposeOptions')) {
            // Send module 'ready' event to parent
            module.exports.emit('ready');
        }
    })
}

// Reload the set of valid purposes
function reloadPurposeOptions (callback) {
    var q = 'SELECT purpose_desc AS purpose FROM purpose';
    util.dbQuery(connString, null, null, q, null,
		 function (result) {
             var tempPurposeOptions = {};
		     for (var i = 0; i < result.rowCount; i++) {
			    var row = result.rows[i];
			    tempPurposeOptions[row.purpose] = true;	// cache
		     }
             // Atomic replace
             purposeOptions = tempPurposeOptions;

             // Send complete notification
             if (callback != undefined) {
                 callback();
             }
		 });
}

// Initialize the set of defaults
function setupDefaults () {
    reloadDefaults(function () {
        // Check whether all queries have completed
        if (util.setReady(isReady, 'defaults')) {
            // Send module 'ready' event to parent
            module.exports.emit('ready');
        }
    })
}

// Reload the set of defaults
function reloadDefaults (callback) {
    var q = 'SELECT attribute_types.type_desc, defaults.value FROM attribute_types, defaults' +
	        ' WHERE attribute_types.type_id = defaults.type_id';
    util.dbQuery(connString, null, null, q, null,
		 function (result) {
             var tempDefaults = {};
		     for (var i = 0; i < result.rowCount; i++) {
			    var row = result.rows[i];
			    tempDefaults[row.type_desc] = row.value;	// cache
		     }
             // Atomic  replace
             defaults = tempDefaults;

             // Send complete notification
             if (callback != undefined) {
                 callback();
             }
		 });
}

// For each purpose, construct a map of attribute names --> (attribute types, operations)
function setupAttributes () {
    reloadAttributes(function () {
        // Check whether all queries have completed
        if (util.setReady(isReady, 'attributes')) {
            // Send module 'ready' event to parent
            module.exports.emit('ready');
        }
    })
}

// Reload the map of attribute names --> (attribute types, operations)
function reloadAttributes (callback) {
    var q = 'SELECT purpose.purpose_desc, attributes.attr_name, attribute_types.type_desc, operations.op_name' +
	        '  FROM attributes, attribute_types, rules, purpose, operations' +
	        ' WHERE attributes.type_id = attribute_types.type_id' +
	        '   AND attributes.type_id = rules.type_id' +
	        '   AND purpose.purpose_id = rules.purpose_id' +
	        '   AND rules.op_id = operations.op_id';
    util.dbQuery(connString, null, null, q, null,
		 function (result) {
             var tempAttributes = {};
		     for (var i = 0; i < result.rowCount; i++) {
			    var row = result.rows[i];
			    if (tempAttributes[row.purpose_desc] == undefined) {
			        // Create the new purpose
			        tempAttributes[row.purpose_desc] = {};
			    }
			    tempAttributes[row.purpose_desc][row.attr_name] =
			        { type_desc: row.type_desc,
			          op_name: row.op_name };	// cache
		     }
             // Atomic replace
             attributes = tempAttributes;

             // Send complete notification
             if (callback != undefined) {
                 callback();
             }
		 });
}

// Verify that requestedPurpose is defined
function verifyPurpose(requestedPurpose) {
    if (purposeOptions.hasOwnProperty(requestedPurpose)) {
	    return requestedPurpose;
    } else {
	    return DEFAULT_PURPOSE;
    }
}

// Iterate over obj and transform values of attributes that are of interest for this deIdentPurpose
function transformObject(req, parent, attr, obj) {
    var type = util.typeOf(obj);

    switch (type) {
    case 'Object':
	    for (var prop in obj) {
	        // Ignore inherited properties
	        if (obj.hasOwnProperty(prop)) {
		        transformObject(req, obj, prop, obj[prop]);
	        }
	    }
	    break;
    case 'Array':
	    for (var i = 0; i < obj.length; i++) {
	        transformObject(req, obj, null, obj[i]);
	    }
	    break;
    case 'Function':
	    // Ignore functions
	    break;
    default:
	    if (attr != null) {
	        // This is a property of an object (not an array element or primitive)
	        var map = attributes[req.params.deIdentPurpose][attr];
	        if ((map != undefined) && (obj.toString().length > 0)) {
		    // Found a value to modify -- do it
		    parent[attr] = operations[map.op_name](map.type_desc, obj);
//    		console.log(req.params.deIdentPurpose + '- attr: ' + attr + ' ' + JSON.stringify(map) +
//        			    ' old: ' + obj + ' new: ' + parent[attr]);
	        }
	    }
	    break;
    }
}

// Define operations and their associated functions
var operations = {
    // Blank the value
    erase: function (type_desc, value) {
	    return '';
    },

    // Replace the value with bullets
    hide: function (type_desc, value) {
	    return HIDE_STRING;
    },

    // Replace the alphanumeric characters of the value with 'X'
    mask: function (type_desc, value) {
	    return value.toString().replace(/[A-Z,a-z,0-9]/g, MASK_CHAR);
    },

    // Make the value less precise
    defocus: function (type_desc, value) {
	    switch (type_desc) {
	    case 'dob':
	        try {
		        var d = new Date(value);
		        // Convert to 'Qn/YYYY'
		        return 'Q' + (Math.floor(d.getOrdinalNumber()/92)+1) + '/' + d.getFullYear();
	        } catch (err) {
		        return ERROR_STRING;
	        }
	    case 'zip':
	        var parts = value.split('-');
	        if (parts[0].length == 5) {
		        // Convert to 'n0000';
		        return parts[0].substr(0,1) + '0000';
	        } else {
		        return ERROR_STRING;
	        }
	    default:
	        return ERROR_STRING;
	    }
    },

    // Otherwise, replace the value with a type-specific default value
    default: function (type_desc, value) {
	    return defaults[type_desc];
    }
};
