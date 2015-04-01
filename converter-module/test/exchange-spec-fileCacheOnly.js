var resolve = require('path').resolve;

var exchange = require('../index')({
    useFileStoreOnly:true,
    fileStore: resolve(__dirname, './data/exchange-spec-fileCacheOnly.txt.mock')
  });

// Mocks
var ratesCache = {};
ratesCache.rates = {
  "USD": {
    symbol: '$',
    rate: "1.00"
  },
  "CAD": {
    symbol: "$",
    rate: "1.50"
  }
};
var timestamp = 1200580046;

module.exports = {
  // integration
  FileCacheOnly_getConversionRate: {
    USDtoEUR: function(test) {
      exchange.getConversionRate('USD', 'EUR', function (err, rate) {
        test.ifError(err);
        test.equals(rate, 0.75);
        test.done();
      });
    },
    EURtoINR: function(test) {
      exchange.getConversionRate('EUR', 'INR', function (err, rate) {
        test.ifError(err);
        test.equals(rate, 80);
        test.done();
      });
    }
  },
  FileCacheOnly_convert: {
    USDtoEUR: function(test) {
      exchange.convert({
        from: 'USD',
        to: 'EUR',
        amount: 1000
      }, function (err, amount, country, symbol) {
        test.ifError(err);
        test.equals(amount, 750);
        test.equals(country, 'EUR');
        test.equals(symbol, '€');
        test.done();
      });
    },
    EURtoINR: function(test) {
      exchange.convert({
        from: 'EUR',
        to: 'INR',
        amount: 1000
      }, function (err, amount, country, symbol) {
        test.ifError(err);
        test.equals(amount, 80000);
        test.equals(country, 'INR');
        test.equals(symbol, '₹');
        test.done();
      });
    }
  },
  // unit
  PrivateMethods: {
    _getSymbol: function(test) {
      test.equals(exchange._getSymbol('USD'), '$');
      test.done();
    },
    _isDataExpired: function(test) {
      test.equals(exchange._isDataExpired(timestamp), true);
      test.done();
    }
  }
};
