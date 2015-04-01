var express = require('express');
require('express-resource');
var cors = require('cors');
var app = express();
var http = require('http');
var path = require('path');
var config = require('./config/dev');
var winston = require('./src/logger/');
var requestHandler = require('./src/resource/requestHandler');
var util = require('util');
var corsOptions = {
    methods: 'GET,PUT,POST,DELETE'
};

app.configure(function() {
    app.set('port', config.node.port || 9999);
    app.use(express.cookieParser());
    app.use(express.methodOverride());
    app.use(express.urlencoded());
    app.use(express.json());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(function(err, req, res, next) {
         winston.error(util.inspect(err));
         res.send({
            "Error":util.inspect(err)
         });
         res.end();
    });
});
app.configure('development', function() {
    app.use(express.errorHandler());
});


app.post("/convertCurrencyAmount", requestHandler.convert);

//Create a http server.
http.createServer(app).listen(app.get('port'),function(){
 console.log("Node server is running on port %s", app.get('port'));

})

