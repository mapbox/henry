var request = require('request');

module.exports = exports = function(client, callback) {
    exports.registerClient(client);
    exports.updateClient(client, function(err, client) {
        callback(err, client);
    });
};

// Register setInterval to update client credentials
exports.registerClient = function(client, interval) {
    var interval = interval || 3e5;
    setInterval(function() {
        exports.updateClient(client, function(err, client) {});
    }, interval);
};

exports.updateClient = function(client, props, fn) {
    if ('function' == typeof props) {
        fn = props;
        props = false;
    }
    var url = 'http://169.254.169.254/latest/meta-data/iam/security-credentials/';
    request(url, function(err, res, roles) {
        if (err) {
            log(err);
            return fn(err, client);
        }
        if (res.statusCode != 200) {
            log(null, res.statusCode, roles);
            return fn(null, client);
        }
        url += roles.split('\n')[0];
        request({url: url, json: true}, function(err, res, json) {
            if (err) {
                log(err);
                return fn(err, client);
            }
            if (res.statusCode != 200) {
                log(null, res.statusCode, json);
                return fn(null, client);
            }
            if (json.SecretAccessKey === null) {
                log(new Error('Could not set key/secret/token from valid ' +
                  'response'), res.statusCode, json);
                return fn(null, client);
            }
            // Don't require the 'client' to be a knox client
            if (props) {
                client[props[0]] = json.AccessKeyId;
                client[props[1]] = json.SecretAccessKey;
                client[props[2]] = json.Token;
            } else {
                // See knox Client#copyTo for why client.options must be updated
                client.key = client.options.key = json.AccessKeyId;
                client.secret = client.options.secret = json.SecretAccessKey;
                client.token = client.options.token = json.Token;
            }
            fn(null, client);
        });
    });
};

function ts() {
    return '[' + (new Date).toUTCString() + ']';
};

function log(err, code, body) {
    console.warn('%s Henry: Could not refresh credential cache. ' +
      'Error: %s Code: %s Body: %s', ts(), err, code, body);
}
