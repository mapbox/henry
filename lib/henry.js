var util = require('util');
var request = require('request');

module.exports = exports = function(client, props, callback) {
    if ('function' == typeof props) {
        callback = props;
        props = false;
    }
    // Do not do anything if client already has a key set.
    if ((typeof props == 'object' && client[props[0]]) ||
         client.key) {
        return callback(null, client);
    }
    exports.registerClient(client, props);
    exports.updateClient(client, props, function(err, client) {
        callback(err, client);
    });
};

// Register setInterval to update client credentials
exports.registerClient = function(client, props, interval) {
    var interval = interval || 3e5;
    setInterval(function() {
        exports.updateClient(client, props, function(err, client) {});
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
            return fn(err);
        } else if (res.statusCode != 200) {
            return fn(error(res));
        }
        url += roles.split('\n')[0];
        request({url: url, json: true}, function(err, res, json) {
            if (err) {
                return fn(err);
            } else if (res.statusCode != 200) {
                return fn(error(res));
            } else if (json.SecretAccessKey === null) {
                return fn(new Error('Could not set key/secret/token from valid response'));
            }
            // Don't require the 'client' to be a knox client
            if (props) {
                client[props[0]] = json.AccessKeyId;
                client[props[1]] = json.SecretAccessKey;
                client[props[2]] = json.Token;
                client[props[3]] = json.Expiration;
            } else {
                client.key = json.AccessKeyId;
                client.secret = json.SecretAccessKey;
                client.token = json.Token;
                client.expiration = json.Expiration;
            }
            fn(null, client);
        });
    });
};

// Helper function to create Error objects from response statusCode.
function error(res) {
    var err = new Error(res.statusCode + ' from AWS: ' + res.body);
    err.code = res.statusCode;
    return err;
}
