var Q = require('q');
//require converter module
var exchange = require('../../converter-module')({
    logging: false
});

/*
*  Convert currency  amount to new currency
*  @param options {object}
*  @param options.amount {float} amount to be converted
*  @param options.from {string} [optional] three character currency code of amount. Default "USD".
*  @param options.to {string}  three character currency code of the converted amount
*  @param options {object} res if any error send response status code and error message to client.
*/
exports.getConvertedData = function(amount, to, from, res) {
    //crete promise
    var deferred = Q.defer();
    //calling currency converter module with required data.
    exchange.convert({
        from: from,
        to: to,
        amount: amount
    }, function(err, amount) {
        if (err) {
            //send res back to client with proper error message.
            return res.send(400, {
                error: err.message
            });
            deferred.reject(err.message);
            res.end();
        } else {
            //resolve the promise send back to caller.
            deferred.resolve({
                amount: amount
            });
        }
    });
    return deferred.promise;
}
