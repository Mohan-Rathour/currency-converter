var path = require('path');
var winston = require('winston');

function readConfiguration(){
    if(!process.env.NODE_ENV){
        process.env.NODE_ENV = 'dev';
    }
    return require(path.join(__dirname, process.env.NODE_ENV));
}

module.exports = readConfiguration();
