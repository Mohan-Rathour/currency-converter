//creating logger module.
var winston = require('../logger');
var _ = require("underscore");
//require exchangeService
var exchangeService = require("../service/exchangeService")
    /**
     * Content-Type ->application/json
     * @api {POST} /convertCurrencyAmount?eccyt=inr
        *
        with req Body
            ccData=[
                    {
                        "amount": 100,
                        "cccyt": "INR"
                    },
                    {
                        "amount": 20,
                        "cccyt": "USD"
                    },
                    {
                        "amount": 50,
                        "cccyt": "EUR"
                    }
              ]

     * @apiName Fetch Current amount
     * @apiGroup POST-APIs
     * @apibody  array of json object
            JSON object should have keys("amount","cccyt","eccyt")
            {String} "amount"- Require amount that need to covert(Example- 100).
            {String} "cccyt"-  Current Currency type(Exp-INR).
            {String} "eccyt"-  Expected currency type(Exp-USD).
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200
     *     {
     *       amounts:[{"amount": 0.016,"eccyt":"USD"}, {"amount": 1249.53,"eccyt":"INR"},{"amount": 3349.16,"eccyt":"INR"}],
             "eccyt": "INR"
     *     }
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 404
     * @apiDescription
     *   Accessed through 'POST'
     *  '/convertCurrencyAmount.
     *  This API fetches the ammount data identified by the query parameter and returns as a response.
     */
module.exports = function(req, res) {
    winston.info("File Name >[convert]");
    if (req.query && req.body && req.query.eccyt && req.body.length > 0) {
        var resData = [];
        // iterate the body data.
        _.map(req.body, function(data, index) {
            //calling currency convert method with req data.
            exchangeService.getConvertedData(data.amount, req.query.eccyt, data.cccyt, res).then(function(response) {
                resData.push(response);
                if (parseInt(req.body.length) == (index + 1)) {
                    res.send({
                        amounts: resData,
                        eccyt: req.query.eccyt
                    });
                    res.end()
                }
            }).fail(function(err) {
                sendError(res, err);
            });
        })
    } else {
        sendError(res);
    }
}


//Error handler.
var sendError = function(res, err) {
    var err = err ? err : 'Please send an appropriate query or body data';
    res.send(400, {
        error: err
    });
    res.end();
}
