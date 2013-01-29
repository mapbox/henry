var util = require('util');
var request = require('request');
var knox = require('knox');
var params = {};

var Client = module.exports = exports = function Client(options) {
    // key and secret are required for knox client, so use filler values.
    options.key = this.key = options.key || 'KEY';
    options.secret = this.secret = options.secret || 'SECRET';
    knox.call(this, options);
    // refresh API credential every 30 minutes.
    setInterval(function() {
        exports.checkCredentials(true, function(){});
    }, 60000*30);
}

util.inherits(Client, knox);

Client.prototype._request = function(method, filename, headers, fn) {
    var that = this;
    if ('function' == typeof headers) {
        fn = headers;
        headers = {};
    }
    exports.checkCredentials.call(this, function(err, res) {
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

exports.checkCredentials = function(refresh, fn) {
    var that = this;
    if ('function' == typeof refresh) {
        fn = refresh;
        refresh = false;
    }
    params.url = 'http://169.254.169.254/latest/meta-data/iam/security-credentials/';
    params.timeout = 2000;
    var lapse = this.expires == null ? 0 :
      +new Date() - this.expires;
    if (lapse > 0 || refresh || this.key === 'KEY' || this.secret === 'SECRET') {
        request(params, function(err, res, roles) {
            if (err) return fn(err);
            // If non 200, try to use cached credentials
            if (res.statusCode != 200) return fn(null);
            params.url = params.url + roles.split('\n')[0];
            params.json = true;
            request(params, function(err, res, json) {
                if (err) return fn(err);
                // If non 200, try to use cached credentials
                if (res.statusCode != 200) return fn(null);
                // It is not documented what other Codes may be
                if (json.Code !== "Success") return fn(null);
                if (json.SecretAccessKey === null)
                    return fn(new Error('secretAccessKey and accessKeyId not ' +
                      'provided and could not be determined.'));
                that.secret = json.SecretAccessKey;
                that.key = json.AccessKeyId;
                that.token = json.Token;
                that.expires = Date.parse(json.Expiration);
                fn(null);
            });
        });
    } else {
        fn();
    }
};

exports.createClient = function(options) {
    return new Client(options);
};
