'use strict';

var version = '20130316';

// Required modules
var argv = require('optimist').argv;

if (argv.help) {
    console.log('Usage: ' + argv.$0 + ' {--dev | --development | --stage | --staging}');
    process.exit();
}

var config = {};

// ----- COMMON -----
config.logLevel = 'info';
config.timezone = 'America/Los_Angeles';

// Assume same credentials for all semantic service databases
config.dbCred = 'smart:smart';

// RSA keys
config.publicKeyFile = 'keys/public.pem';
config.privateKeyFile = 'keys/private.pem'

// Limit number of search results
config.dbLimitResults = 25;

// ----- Per deployment -----
if (argv.dev || argv.development) {
    // DEVELOPMENT
    config.deploy = 'DEVELOPMENT';
    config.dbDeploySuffix = '_dev';
    config.listenPort = 8081;
    config.logFile = 'semantic.log';
} else if (argv.stage || argv.staging) {
    // STAGING
    config.deploy = 'STAGING';
    config.dbDeploySuffix = '_stage';
    config.listenPort = 8000;
    config.logFile = '/var/log/semantic-stage.log';
} else {
    // PRODUCTION (default)
    config.deploy = 'PRODUCTION';
    config.dbDeploySuffix = '';
    config.listenPort = 80;
    config.logFile = '/var/log/semantic.log';
}

module.exports = config;
