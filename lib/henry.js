var util = require('util');
var request = require('request');
var knox = require('knox');

function checkCredentials(fn) {
    var that = this;
    var params = {
        url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
        timeout: 2000
    }
    var lapse = this.expires == null ? 0 :
      +new Date() - Date.parse(this.expires);
    if (this.key === 'KEY' || this.secret === 'SECRET' || lapse > 0) {
        request(params, function(err, res, roles) {
            if (err) return fn(err);
            params.url = params.url + roles.split('\n')[0];
            params.json = true;
            request(params, function(err, res, json) {
                if (err) return fn(err);
                if (json.SecretAccessKey === null)
                    return fn(new Error('secretAccessKey and accessKeyId not ' +
                      'provided and could not be determined.'));
                that.secret = json.SecretAccessKey;
                that.key = json.AccessKeyId;
                that.token = json.Token;
                that.expires = json.Expiration;
                fn(null);
            });
        });
    } else {
        fn();
    }
}

var Client = module.exports = exports = function Client(options) {
    // key and secret are required for knox client, so use filler values.
    options.key = this.key = options.key || 'KEY';
    options.secret = this.secret = options.secret || 'SECRET';
    knox.call(this, options);
}

util.inherits(Client, knox);

Client.prototype._request = function(method, filename, headers, fn) {
    var that = this;
    if ('function' == typeof headers) {
        fn = headers;
        headers = {};
    }
    checkCredentials.call(this, function(err, res) {
        if (err) return fn(err);
        var req = knox.prototype.request.call(that, method, filename, headers);
        fn(null, req);
    });
}

Client.prototype.get = function(filename, headers, fn) {
    this._request('GET', filename, headers, function(err, req) {
        fn(err, req);
    });
};

Client.prototype.put = function(filename, headers, fn) {
    this._request('PUT', filename, headers, function(err, req) {
        fn(err, req);
    });
};

Client.prototype.del = function(filename, headers, fn) {
    this._request('DELETE', filename, headers, function(err, req) {
        fn(err, req);
    });
};

exports.createClient = function(options) {
    return new Client(options);
};