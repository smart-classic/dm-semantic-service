'use strict';

// SMART ECRS web service
// File: ecrs.js
var version = '20130316';

// Required modules
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var SignedXml = require('xml-crypto').SignedXml;
var https = require('https');
var util = require('./utility');
require('date-utils');

// Configuration
var config = require('./config');

var ecrsHost = 'stage-services.partners.org';
var ecrsUrl = '/DecisionSupport/Enterprise/ClinicalRules';
var soapEnvelopeTemplateFile = 'envelope.xml';
var keyInfoTemplateFile = 'keyinfo.xml';

// Setup for 'ready' event
module.exports = new EventEmitter();

// The 'isReady' structure to track when this module is fully setup
var isReady = {};
util.setNotReady(isReady, 'loadFiles');

// Globals
var envelope;
var keyInfo;
var publicKey;
var publicKeyStripped;
var privateKey;
loadFiles();

// The 'echo' call
module.exports.echo = function (req, res, next) {
    if (req == undefined) {
        // Return documentation
        return {pre:    {desc: 'ecrs service', version: version},
                desc:   'Call the ECRS "echo" operation.',
                post:   [],
                return: '???',
                error:  '???'};
    } else {
        ecrsRequest(echoRequest, function (result) {
            console.log(result);
        });
    }
};


//---------------------------------------------------------------------------------

// Echo request body
var echoRequest = '<ejb:Echo><arg0>testing</arg0></ejb:Echo>';

// Override default SignedXml KeyInfo element contents
function TemplateKeyInfo() {
    this.getKeyInfo = function (key) {
        return '##KEYINFO##';
    }
}

// Construct SOAP ECRS request and sent it, then return result via callback
function ecrsRequest(body, resultFn) {
    // Merge request with SOAP template
    var request = util.remap(envelope,
                             [{from: '##BODY##', to: body}]);

    // Sign the Body
    var sig = new SignedXml();
    sig.signingKey = privateKey;
    sig.keyInfoProvider = new TemplateKeyInfo();
    sig.addReference("//*[local-name(.)='Body']");
    sig.computeSignature(request);

    // Construct final POST data
    var keyInfoWithKey = util.remap(keyInfo,
                                    [{from: '##PUBKEY##', to: publicKeyStripped}]);

    var signatureWithKeyInfo = util.remap(sig.getSignatureXml(),
                                          [{from: '##KEYINFO##', to: keyInfoWithKey}]);

    var postData = util.remap(sig.getOriginalXmlWithIds(),
                              [{from: '##SIG##', to: signatureWithKeyInfo}]);

    // Create the HTTPS request
    var options = {
        hostname: ecrsHost,
        port: 443,
        path: ecrsUrl,
        headers: {'Content-Type': 'text/xml',
                  'Content-Length': postData.length,
                  'SOAPaction': '""'},
        method: 'POST',
        key: privateKey,
        cert: publicKey,
        agent: false
    };

    var req = https.request(options, function (res) {
//        console.log('status: ' + res.statusCode);
//        console.log('headers: ' + JSON.stringify(res.headers));

        // Send back the response
        res.on('data', function (data) {
            resultFn(data.toString());
        })
    });

    req.on('error', function (err) {
        console.log('error: ' + err);
    });

    // Send the POST data
    req.end(postData);
}

// Load the necessary files
function loadFiles() {
    try {
        envelope = fs.readFileSync(__dirname + '/' + soapEnvelopeTemplateFile, 'utf8');
        keyInfo = fs.readFileSync(__dirname + '/' + keyInfoTemplateFile, 'utf8');
        publicKey = fs.readFileSync(__dirname + '/' + config.publicKeyFile, 'utf8');
        publicKeyStripped = publicKey
            .replace('-----BEGIN CERTIFICATE-----','')
            .replace('-----END CERTIFICATE-----','')
            .replace(new RegExp('\\n', 'g'),'');
        privateKey = fs.readFileSync(__dirname + '/' + config.privateKeyFile, 'utf8');
    } catch (e) {
        console.error(e.message);
        process.exit();
    }

    if (util.setReady(isReady, 'loadFiles')) {
        // Send module 'ready' event to parent (sync file reads seem to require the timeout)
        setTimeout(function () {
            module.exports.emit('ready')
        });
    }
}
