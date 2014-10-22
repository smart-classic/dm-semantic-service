'use strict';

// SMART semantic services
// File: semantic.js
var version = '20130320';

// Required modules
var restify = require('restify');
var Logger = require('bunyan');
require('date-utils');
var util = require('./utility');

// Configuration
var config = require('./config');

// Create a file logger enabling the standard serializers
var logInst = new Logger({
    		    name: 'Semantic',
		        serializers: Logger.stdSerializers,
    		    streams: [
		        {
		            level: config.logLevel,
		            path: config.logFile
		        }]
});

// Setup restify
var server = restify.createServer({log: logInst});
server.use(
  function crossOrigin(req,res,next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    return next();
  }
);
server.use(restify.bodyParser());

// Kluge to log 'Not Found' errors
server.on('NotFound', function (req, res) {
    logInst.info({req: req}, 'Not Found: ' + req.path);
    res.header('content-type', 'text/plain');
    res.send(404, 'Not Found\n');
});

// Correctly handle HTTP OPTIONS
server.on('MethodNotAllowed', function (req, res) {
    if (req.method == 'OPTIONS') {
	    // Add header to satisfy CORS preflight check
	    res.header('Access-Control-Allow-Headers', 'content-type, x-requested-with');
	    res.send('');
    } else {
	    logInst.info({req: req}, 'Method Not Allowed: ' + req.method + ' ' + req.path);
	    res.header('content-type', 'text/plain');
	    res.send(405, 'Method Not Allowed\n');
    }
});

// Log completion
process.on('SIGINT', function () {
    var d = new Date();
    var msg = 'Stopped: ' + d.toFormat('YYYYMMDD-HH24:MI:SS');
    logInst.info(msg);
    console.log(msg);
    process.exit();
})

// Keep track of which service modules are ready
var isReady = {};
util.setNotReady(isReady, 'de_ident');
util.setNotReady(isReady, 'ecrs');
util.setNotReady(isReady, 'cart');
util.setNotReady(isReady, 'problems_meds');
util.setNotReady(isReady, 'ident');
util.setNotReady(isReady, 'diverse');


// ---------- Document the available routes --------------------
server.get('/', documentRoutes);


// ---------- Configure the de_ident service --------------------
var di = require('./de_ident');
di.on('ready', function () {
    // Check whether all services are ready
    if (util.setReady(isReady, 'de_ident')) {
	    // Yes -- start listening for requests
	    listen();
    }
});

// Allowed de_ident methods and routes
server.get('/de_ident', di.deIdentPurposes);
server.post('/de_ident', di.deIdent);
server.post('/de_ident/:urlDeIdentPurpose', di.deIdent);


// ---------- Configure the ecrs service --------------------
var ecrs = require('./ecrs');
ecrs.on('ready', function () {
     // Check whether all services are ready
    if (util.setReady(isReady, 'ecrs')) {
        // Yes -- start listening for requests
        listen();
    }
});

// Allowed ecrs methods and routes
server.post('/ecrs/echo', ecrs.echo);


// ---------- Configure the cart service --------------------
var cart = require('./cart');
cart.on('ready', function () {
    // Check whether all services are ready
    if (util.setReady(isReady, 'cart')) {
        // Yes -- start listening for requests
        listen();
    }
});

// Allowed cart methods and routes
server.get('/cart/actions/:forSectionName', cart.getActions);
server.post('/cart/submit', cart.submit);
server.post('/cart/edit/:itemId', cart.edit);
server.get('/cart/count/:forAccountId', cart.getCount);
server.get('/cart/contents/:forAccountId', cart.getContents);
server.get('/cart/history/:forAccountId/:startDate/:endDate', cart.getHistory);
server.get('/cart/pending/:forPatient', cart.getPending);
server.post('/cart/delete/:itemId/:byAccountId', cart.delete);
server.post('/cart/commit/:byAccountId/:forAccountId', cart.commit);
server.post('/cart/commit/:byAccountId/:forAccountId/:forPatient', cart.commit);


// ---------- Configure the problems_meds service --------------------
var pm = require('./problems_meds');
pm.on('ready', function () {
    // Check whether all services are ready
    if (util.setReady(isReady, 'problems_meds')) {
        // Yes -- start listening for requests
        listen();
    }
});

// Allowed problems_meds methods and routes
server.get('/problems_meds/sources', pm.problemsMedsSources);
server.post('/problems_meds/with_sources', pm.problemsMedsWithSources);
server.post('/problems_meds', pm.problemsMeds);
server.post('/problems_meds/problems', pm.problems);
server.post('/problems_meds/meds', pm.meds);


// ---------- Configure the ident service --------------------
var ident = require('./ident');
ident.on('ready', function () {
    // Check whether all services are ready
    if (util.setReady(isReady, 'ident')) {
        // Yes -- start listening for requests
        listen();
    }
});

// Allowed ident methods and routes
server.get('/facility_types', ident.getFacilityTypes);
server.post('/facility_type/create', ident.createFacilityType);
server.post('/facility_type/edit/:facTypeId', ident.editFacilityType);
server.post('/facility_type/delete/:facTypeId', ident.deleteFacilityType);

server.post('/ident/org/create', ident.createOrg);
server.post('/ident/org/edit/:orgId', ident.editOrg);
server.post('/ident/org/delete/:orgId', ident.deleteOrg);
server.get('/ident/orgs', ident.getOrgs)
server.get('/ident/orgs/find/:searchFor', ident.searchForOrgs);

server.post('/ident/loc/create', ident.createLoc);
server.post('/ident/loc/edit/:locId', ident.editLoc);
server.post('/ident/loc/delete/:locId', ident.deleteLoc);
server.get('/ident/locs/:forOrgId', ident.getLocsForOrg);

server.post('/ident/group/create', ident.createGroup);
server.post('/ident/group/edit/:groupId', ident.editGroup);
server.post('/ident/group/delete/:groupId', ident.deleteGroup);
server.get('/ident/groups/:forLocId', ident.getGroupsForLoc);

server.get('/ident/user/:accountId', ident.getUser);
server.post('/ident/user/create/:accountId', ident.createUser);
server.post('/ident/user/edit/:accountId', ident.editUser);
server.post('/ident/user/delete/:accountId', ident.deleteUser);
server.get('/ident/users/:forGroupId', ident.getUsersForGroup);
server.get('/ident/users/find/:searchFor/:forOrgId', ident.searchForUser);


// ---------- Configure the diverse service --------------------
var diverse = require('./diverse');
diverse.on('ready', function () {
    // Check whether all services are ready
    if (util.setReady(isReady, 'diverse')) {
        // Yes -- start listening for requests
        listen();
    }
});

// Allowed diverse methods and routes
server.get('/entity_types', diverse.getEntityTypes);

server.get('/specialties', diverse.getSpecialties);
server.post('/specialty/create', diverse.createSpecialty);
server.post('/specialty/edit/:specId', diverse.editSpecialty);
server.post('/specialty/delete/:specId', diverse.deleteSpecialty);

server.get('/sections', diverse.getSections);

server.get('/section/ordersets', diverse.getSectionOrdersetsDiag);
server.get('/section/ordersets/:accountId', diverse.getSectionOrdersetsForUserDiag);
server.get('/section/orderset/:accountId/:specId', diverse.getSectionOrderset);
server.post('/section/orderset/create', diverse.createSectionOrderset);
server.post('/section/orderset/delete', diverse.deleteSectionOrderset);

server.get('/panels', diverse.getPanels);
server.post('/panel/create', diverse.createPanel);
server.post('/panel/edit/:panelId', diverse.editPanel);
server.post('/panel/delete/:panelId', diverse.deletePanel);

server.get('/panel/ordersets', diverse.getPanelOrdersetsDiag);
server.get('/panel/ordersets/:section/:accountId', diverse.getPanelOrdersetsForUserDiag);
server.get('/panel/orderset/:section/:accountId/:specId', diverse.getPanelOrderset);
server.post('/panel/orderset/create', diverse.createPanelOrderset);
server.post('/panel/orderset/delete/:forSecId', diverse.deletePanelOrderset);

server.get('/test/name/:loinc', diverse.getTestName);
server.post('/test/name/create', diverse.createTestName);
server.post('/test/name/edit/:loinc', diverse.editTestName);
server.post('/test/name/delete/:loinc', diverse.deleteTestName);
server.post('/test/:accountId/:specId/:cid', diverse.getTests);
server.post('/test/find/:searchFor', diverse.searchForTest);
server.post('/test/create', diverse.createTestAssoc);
server.post('/test/delete/:assocId', diverse.deleteTestAssoc);
server.get('/test/ordersets', diverse.getTestOrdersetsDiag);
server.post('/test/orderset/create', diverse.createTestOrderset);
server.post('/test/orderset/delete/:forPanelId', diverse.deleteTestOrderset);
server.post('/test/check', diverse.checkTests);


//---------------------------------------------------------------------------------

// SUPPORT FUNCTIONS

// Document routes
function documentRoutes (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {pre:  {desc:'All Valid Routes', version:version},
                desc: 'Show this page (all valid ' + config.deploy + ' routes).'};
    } else {
        res.writeHead(200);
        res.end(util.documentRestifyRoutes(server));
        return next();
    }
}

// Start listening...
function listen () {
    server.listen(config.listenPort, function() {
	    var d = new Date();
	    var msg = 'Started: {0} Listening at {1} ({2})'.format(d.toFormat('YYYYMMDD-HH24:MI:SS'), server.url, config.deploy);
	    logInst.info(msg);
	    console.log(msg);
    });
}
