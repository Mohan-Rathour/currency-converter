
var http = require('http');
var fs = require('fs');
var resolve = require('path').resolve;

// shared resouces
var ratesCache = null;
var symbolsFile = resolve(__dirname, './data/symbols_utf8.json');

/*
 *  Configure the exchange module
 *  @param config {object}
 *  @param config.hostname {string} domain to 3rd party rates API
 *  @param config.path {string} path for 3rd party rates API
 *  @param config.apiID {string} path to 3rd party rates API
 *  @param config.fileStore {string} path and filename of where to cache rates
 *  @param config.useFileStoreOnly {bool} if true, won't make 3rd party API request
 *  @param config.logging {bool} if true, log to console. Default: false
 */
module.exports = function(config) {

  'strict mode';

  config          = config || {};
  var hostname    = config.hostname || 'openexchangerates.org';
  var path        = config.path || '/api/latest.json?app_id=';
  var id          = config.apiID || '3e2ebdb2317b453fa6a3bb88d3bd59c1';
  var cacheFile   = config.fileStore || resolve(__dirname, './data/ratesCache.txt');
  var useFileOnly = config.useFileStoreOnly || false;
  var logging     = config.logging || false;


  /****************
   * PUBLIC METHODS
   ****************/

  /*
   *  Convert dollar amount to new currency
   *  @param options {object}
   *  @param options.amount {float} amount to be converted
   *  @param options.from {string} [optional] three character currency code of amount. Default "USD".
   *  @param options.to {string}  three character currency code of the converted amount
   */
  function convert (options, callback) {
    if (!options) callback( new Error('convert method requires options object as first argument') );

    var amount = options.amount || callback( new Error('convert method requires options.amount') );
    var from = options.from || 'USD';
    var to = options.to || callback( new Error('convert method requires options.to') );
    var newAmount;
    var toSymbol;

    getConversionRate(from, to, function(err, rate) {
      if (err) return callback(err);
      toSymbol = _getSymbol(to);
      newAmount = parseInt(Math.round(amount * rate * 100)) / 100;
      callback(null, newAmount, to, toSymbol);
    });

  }

  /*
   *  Return the conversion rate for a given 3-letter country code
   *  @param fromCountry {string} three letter country code
   *  @param toCountry {string} three letter country code
   *
   *  Stack: getConversinoRate -> _getCurrencyInfo -> _getData -> [return from memory OR _readCacheFile OR _getNewRates]
   *        IF _readCacheFile -> return from file
   *        IF _getNewRates -> _formatResponse -> _writeCacheFile -> return after file write completed
   */
  function getConversionRate(fromCountry, toCountry, callback) {
    if (!fromCountry) return callback(new Error('fromCountry must have a value'));
    if (!toCountry) return callback(new Error('toCountry must have a value'));

    _getCurrencyInfo(fromCountry, function fromCountry(err, data) {
      if (err) return callback(err);
      var fromRate = data.rate;
      _log('getConversionRate | fromRate:', fromRate);
      _getCurrencyInfo(toCountry, function toCountry(err, data) {
        if (err) return callback(err);
        var toRate = data.rate;
        _log('getConversionRate | toRate:', toRate);
        var conversionRate = Math.round(toRate / fromRate * 1000000) / 1000000;
        _log('getConversionRate | conversionRate:', conversionRate);
        callback(null, conversionRate);
      });
    });
  }


  /******************
   * PRIVATE METHODS
   ******************/

  /*
   *  Returns only the portion of data needed
   *  @param countryCode {string} 3 letter country code
   */
  function _getCurrencyInfo(countryCode, callback) {
    _getData(function currencyInfo(err, data) {
      if (err) return callback(err);
      if (!data.rates[countryCode]) return callback(new Error('Invalid country code.'));
      _log('_getCurrencyInfo | data["'+countryCode+'"]:', data.rates[countryCode]);
      callback(null, data.rates[countryCode]);
    });
  }

  /*
   *  Returns the full rates object properly formatted, ensuring up-to-date data
   *  This method tries to performantly return the latest data
   *  based on the fact that the API only updates every hour.
   *  Also, for performance, this method first looks to the memory cache,
   *  then the local file cache, and finally makes the http, API request.
   */
  function _getData(callback) {
    _log('_getData | ratesCache: ', (ratesCache)? 'cache is primed' : ratesCache);
    _log('_getData | useFileOnly', useFileOnly);
    // if data is in memory and not expired or config forbids http requests: return data
    if ( ratesCache && (!_isDataExpired(ratesCache.timestamp) || useFileOnly) ) {
      _log('_getData | path 1');
      callback(null, ratesCache);
    }
    // if no data in memory and config forbids http requests: fetch file, save into memory and return data
    else if ( !ratesCache && useFileOnly ) {
      _log('_getData | path 2');
      _readCacheFile(cacheFile, function cacheFile1(err, data) {
        if (err) return callback(err);
        ratesCache = data;
        callback(null, data);
      });
    }
    // if data is in memory but expired and config allows http request: fetch new data
    // (if data in memory is stale, it's safe to assume data in file is stale)
    else if ( ratesCache && _isDataExpired(ratesCache.timestamp && !useFileOnly) ) {
      _log('_getData | path 3');
      _getNewRates(callback);
    }
    // if no data in memory and config allows http request and file exists: check if it is expired
    else if ( !ratesCache && !useFileOnly && fs.existsSync(cacheFile) ) {
      _log('_getData | path 4');
      _readCacheFile(cacheFile, function cacheFile2(err, data) {
        if (err) return callback(err);
        // if data expired, fetch new data
        if ( _isDataExpired(data.timestamp) ) {
          _log('_getData | path4 | cachedFile data expired');
          _getNewRates(callback);
        }
        // if data is fresh, put it in memory and return it
        else {
          _log('_getData | path4 | cachedFile data is fresh');
          ratesCache = data;
          callback(null, data);
        }
      });
    }
    // else fetch new data
    else {
      _log('_getData | path 5');
      _getNewRates(callback);
    }
  }

  /*
   *  Requests new data over http from API, reformats it, caches it in memory and writes it to file
   *  STACK: _getNewRates -> _formatResponse -> _writeCacheFile -> return data
   */
  function _getNewRates(callback) {
    var options = {
      hostname: hostname,
      path: path+id
    };
    var response = '';
    // request new data from API
    http.get(options, function(res) {
      res.setEncoding('utf8');
      res.on('error', callback);
      res.on('data', function httData(chunk) {
        _log('_getNewRates | on.data | chunk received');
        response += chunk;
      });
      res.on('end', function httpEnd() {
        _log('_getNewRates | on.end | response:', response);
        // reformatt API response to match template
        _formatResponse(JSON.parse(response), function formattedResponse(err, data) {
          if (err) return callback(err);
          //cache data in memory
          ratesCache = data;
          //write data to file in special format
          _writeCacheFile(cacheFile, data, function writeCacheFile(err) {
            if (err) return callback(err);
            callback(null, data);
          });
        });
      });
    });
  }

  /*
   *  Read text file, construct correct format, build into JSON
   *  @param file {string} path to file to read
   */
  function _readCacheFile(file, callback) {
    var currencyRegex = /([A-Z]{3})=(.+)\s([0-9.]+)/gm;
    var timestampRegex = /timestamp=\s(\d+)/;
    var ary = [];
    var obj = {};
    obj.rates = {};
    var timestamp;
    fs.readFile(file, 'utf8', function(err, data) {
      if (err) return callback(err);
      while ((ary = currencyRegex.exec(data)) !== null)
      {
        obj.rates[ary[1]] = {
          symbol: ary[2],
          rate: parseFloat(ary[3])
        };
      }
      timestamp = timestampRegex.exec(data);
      obj.timestamp = parseInt(timestamp[1], 10);
      _log('_readCacheFile:', obj);
      callback(null, obj);
    });
  }

  /*
   *  Refomats data to file format and saves to disk
   * @param file {string} path to file where data is written
   * @param data {object} holds rates and timestamp, already formatted correctly
   */
  function _writeCacheFile(file, data, callback) {
    var rateTemplate = '{{country}}={{symbol}} {{rate}}';
    var timestampTemplate = 'timestamp= {{time}}';
    var timestamp = data.timestamp;
    var ratesObj = data.rates;
    var symbol;
    var rate;
    var text = timestampTemplate.replace('{{time}}', timestamp);

    for (var currency in ratesObj) {
      symbol = ratesObj[currency].symbol;
      rate = ratesObj[currency].rate;
      text += '\n'+rateTemplate
                .replace('{{country}}', currency)
                .replace('{{symbol}}', symbol)
                .replace('{{rate}}', rate);
    }
    _log('_writeCacheFile | text:', text);
    fs.writeFile(file, text, function(err) {
      if (err) return callback(err);
      _log('_writeCacheFile | file written successfully');
      callback(null, text);
    });

  }



  /*
   *  Returns data formatted as { USD: {symbol:$, rate:1.0} }
   *  @param data {obj} data object from API request
   */
  function _formatResponse (data, callback) {
    var obj = {};
    obj.rates = {};
    obj.timestamp = data.timestamp;
    //read symbols JSON
    fs.readFile(symbolsFile, 'utf8', function(err, symbols) {
      if (err) return callback(err);
      symbols = JSON.parse(symbols);
      //reformat rates and merge with symbols
      for (var currency in data.rates) {
        obj.rates[currency] = {};
        obj.rates[currency].rate = data.rates[currency];
        obj.rates[currency].symbol = symbols[currency] || '$';
      }
      _log('_formatResponse | returned object:', obj);
      callback(null, obj);
    });

  }

  /*
   *  Determines if the data needs to be refreshed
   *  SLA from openexchangerates.org gives new data every hour
   *  @param timestamp {string} UNIX time, needs *1000 to make into miliseconds
   */
  function _isDataExpired(timestamp) {
    var now = new Date();
    timestamp = new Date(timestamp*1000);
    var expiration = new Date( timestamp.setHours(timestamp.getHours()+1) );

    if ( now > expiration ) return true;
    return false;
  }

  /*
   *  Returns the symbol for a currency, **assumes data is already cached
   *  @param country {string} threee letter country code
   */
  function _getSymbol(country) {
    return ratesCache.rates[country].symbol;
  }

  /*
   *  logging utility, activat/deactivate with config option "logging"
   */
  function _log() {
    if (!logging) return;
    var args = Array.prototype.slice.call(arguments, 0);
    console.log.apply(this, args);
  }


  /********************
   * DEFINE PUBLIC API
   ********************/

  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
    return {
      convert: convert,
      getConversionRate: getConversionRate
    };
  }
  else {
    return {
      convert: convert,
      getConversionRate: getConversionRate,
      _getSymbol: _getSymbol,
      _isDataExpired: _isDataExpired,
      _formatResponse: _formatResponse,
      _writeCacheFile: _writeCacheFile,
      _readCacheFile: _readCacheFile,
      _getNewRates: _getNewRates,
      _getData: _getData,
      _getCurrencyInfo: _getCurrencyInfo
    };
  }
};
