var util = require('util');
var request = require('request');

function Henry(options) {
    if (!(this instanceof Henry)) {
        return new Henry(options);
    }
    options = options || {};
    this.api = options.api || 'http://169.254.169.254';
    this.version = options.version || 'latest';
    this.interval = options.interval || 3e5
    this.clients = [];
    this.refresh(function(err) {
        if (!err) this.start();
    }.bind(this));
}

Henry.prototype.refresh = function(fn) {
    fn = fn || function() {};
    var self = this;
    var url = this.api + '/' + this.version + '/meta-data/iam/security-credentials/';
    request({
        url: url,
        timeout: 1000
    }, function(err, res, roles) {
        if (err) {
            return fn(err);
        } else if (res.statusCode != 200) {
            return fn(error(res));
        }
        url += roles.split('\n')[0];
        request({url: url, json: true}, function(err, res, credentials) {
            if (err) {
                return fn(err);
            } else if (res.statusCode != 200) {
                return fn(error(res));
            } else if (credentials.SecretAccessKey === null) {
                return fn(new Error('Could not set key/secret/token from valid response'));
            }
            credentials = {
                key: credentials.AccessKeyId,
                secret: credentials.SecretAccessKey,
                token: credentials.Token,
                expiration: credentials.Expiration
            };
            self.clients.forEach(function(val) {
                if (!val.client || !val.mapping) return;
                val.client[val.mapping.key] = credentials.key;
                val.client[val.mapping.secret] = credentials.secret;
                val.client[val.mapping.token] = credentials.token;
                val.client[val.mapping.expiration] = credentials.expiration;
            });
            fn(null, credentials);
        });
    });
};

Henry.prototype.add = function(client, props, callback) {
    if (typeof props == 'function') {
        callback = props;
        props = false;
    }
    props = props || {
        key: 'key',
        secret: 'secret',
        token: 'token',
        expiration: 'expiration'
    };
    this.clients.push({
        client: client,
        mapping: props
    });
    this.refresh(callback);
};

Henry.prototype.remove = function(client) {
    // TODO
};

Henry.prototype.start = function() {
    this.timer = setInterval(this.refresh.bind(this), this.interval);
};

Henry.prototype.stop = function() {
    clearInterval(this.timer);
    this.timer = null;
};

// Helper function to create Error objects from response statusCode.
function error(res) {
    var err = new Error(res.statusCode + ' from AWS: ' + res.body);
    err.code = res.statusCode;
    return err;
}

module.exports = Henry;
