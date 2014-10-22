// SMART semantic services utilities
// File: utility.js
// Ver: 20130320

// Required modules
require('date-utils');
var time = require('time');
var pg = require('pg');
var fs = require('fs');
var Handlebars = require('handlebars');

// Configuration
var config = require('./config');

// Add an 'ifarray' block helper to Handlebars
Handlebars.registerHelper('ifarray', function (context, options) {
    var type = Object.prototype.toString.call(context);
    if (type === '[object Function]') { context = context.call(this); }

    if (!context || Handlebars.Utils.isEmpty(context) || type != '[object Array]') {
        return options.inverse(this);
    } else {
        return options.fn(this);
    }
});

// Handlebars template file for documentRestifyRoutes()
var documentTemplate = Handlebars.compile(fs.readFileSync(__dirname + '/semantic-doc.html', 'utf8'));

// Execute postgresql parameterized query and call resultFn(response, queryResult)
//   connString: postgresql connection string
//   request: restify request object
//   response: restify response object
//   query: parameterized query
//   paramArray: parameters for query
//   resultFn: function (queryResult)
exports.dbQuery = function (connString, request, response, query, paramArray, resultFn) {
    pg.connect(connString, function (err, client) {
        if (err != null) {
            var errStr = 'Connection Error: ' + err.message;
            if (request != null) {
                request.log.error(errStr);
                exports.sendText(request, response, 400, errStr);
            } else {
                console.log(errStr);
            }
        } else {
            client.query(query, paramArray, function (err, result) {
                if (err != null) {
                    var errStr = 'Query Error: ' + err.message;
                    if (request != null) {
                        request.log.error(errStr);
                        exports.sendText(request, response, 400, errStr);
                    } else {
                        console.log(errStr);
                    }
                } else {
                    resultFn(result);
                }
            })
        }
    })
};

// Create a list of '($1,$2,...,$len)' with no offset
//   or a list of '($n,$n+1,...)' with offset=n
exports.placeHolderList = function (len, offset) {
    var h = new Array(len);
    var start = (offset == undefined) ? 0 : offset;
    for (var i = 0; i < len; i++)
        h[i] = '$' + (start+i+1);
    return '(' + h.join(',') + ')';
};

// Determine the type of obj (by hacking apart '[object Array]' etc.)
exports.typeOf = function (obj) {
    return Object.prototype.toString.call(obj).split(' ')[1].slice(0, -1);
};

// Add a format method to String: 'hello {1} {2}'.format('there', '.') --> 'hello there.'
String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{'+i+'\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

// Functions to determine whether a set of asynchronous components are all "ready"
//   (this could be done with a counter, but then harder to observe)

// Set the tracking structure's element for this named component to "not ready"
exports.setNotReady = function (isReady, name) {
    isReady[name] = false;
};

// Set the tracking structure's element for this named component to "ready"
//   and return true if ALL elements are "ready"
exports.setReady = function (isReady, name) {
    isReady[name] = true;

    for (var key in isReady) {
	    if (isReady.hasOwnProperty(key) && !isReady[key]) {
	        // At least one element is not "ready"
	        return false;
	    }
    }

    // All elements are "ready"
    return true;
};

// Convert 'from' strings to 'to' strings (change case, instantiate parameters, etc.)
// 'struct' is a string or structured data object (hash).
// 'mapArray' is an array of objects, each containing a 'from' and 'to' member.
exports.remap = function (struct, mapArray) {
    var result = (exports.typeOf(struct) == 'String') ? struct : JSON.stringify(struct);
    for (var i = 0; i < mapArray.length; i++) {
        var map = mapArray[i];
        var regExp = new RegExp(map.from, 'g');
        result = result.replace(regExp, map.to);
    }

    return (exports.typeOf(struct) == 'String') ? result : JSON.parse(result);
};

// Create group structure
// 'array' is the set of elements to group
// 'predicate' is the function to select the item of each element to group on
exports.groupBy = function (array, predicate) {
    var groups = {};
    for (var i = 0; i < array.length; i++) {
        var groupKey = predicate(array[i]);
        if (groups[groupKey] == undefined) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(array[i]);
    }
    return groups;
};

// Order the array 'array' (MODIFIES THE ARRAY!)
// 'ascending' for ascending order, else descending order
// 'select' is the function to select the item of each element to order on
exports.orderBy = function (array, ascending, select) {
    var ascendingB = (ascending == 'ascending');
    return array.sort(function (a, b) {
        var predA = select(a);
        var predB = select(b);
        return predA < predB ? (ascendingB ? -1 : 1) : predA > predB ? (ascendingB ? 1 : -1) : 0;
    })
};

// Send text response (with headers)
exports.sendText = function (req, res, code, val) {
    var strVal = val.toString();
    req.log.info({req:req}, strVal);
    res.header('Access-Control-Allow-Headers', 'content-type, x-requested-with');
    res.header('content-type', 'text/plain');
    res.send(code, strVal);
};

// Send JSON response (with headers)
// TODO: Check for Accept-Encoding header & compress response
exports.sendJson = function (req, res, val) {
    req.log.info({req: req}, val);
    res.header('Access-Control-Allow-Headers', 'content-type, x-requested-with');
    res.json(val);
};

// Document restify routes
exports.documentRestifyRoutes = function (server) {
    // Collect documentation
    var calls = {};
    var callUrls = [];
    for (var i=0; i < server.routes.length; i++) {
        try {
            // Get documentation from route's function (if defined)
            var doc = server.routes[i].chain[2]();

            // Add route info
            var route = server.routes[i]._name;
            var id = makeId(route);
            doc.url = {route:route, id:id};

            // Construct 'calls' element (for Javascript create/edit)
            var elt = {path: route.split(' ')[1]};
            if (doc.params != undefined) {
                elt.params = doc.params;
            };
            if (doc.post != undefined) {
                elt.post = doc.post;
            };
            calls[id] = elt;

            // Add doc to 'callUrls' (for page display)
            callUrls.push(doc);

        } catch (e) {}
    }

    // Goo for getting timezone
    var z = new time.Date();
    z.setTimezone(config.timezone);
    var zone = z.getTimezoneAbbr();

    // Construct generated date
    var d = new Date();
    var timestamp = d.toFormat('D MMMM YYYY &nbsp;H:MI:SS P ') + zone;

    // Populate the template
    return documentTemplate({calls:JSON.stringify(calls), callUrls:callUrls, timestamp:timestamp, deployMode:config.deploy});
}

// "Squish" a route into an identifier (remove spaces and colons, replace forward slash with underscore)
function makeId(route) {
    return route.replace(/ /g, '').replace(/:/g, '').replace(/\//g, '_');
}
