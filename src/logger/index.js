var winston = require('winston');
var config = require('../../config');
//Display  logger on the basis config log level.
var logger = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
            level: config.logLevel,
            json: false,
            timestamp: true,
            colorize: true
        }),
        new winston.transports.File({
            filename: './logs/debug.log',
            level: config.logLevel,
            json: false,
            colorize: true
        })
    ],
    exceptionHandlers: [
        new(winston.transports.Console)({
            level: config.logLevel,
            json: false,
            timestamp: true,
            colorize: true
        }),
        new winston.transports.File({
            filename: './logs/exceptions.log',
            level: config.logLevel,
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

module.exports = logger;
