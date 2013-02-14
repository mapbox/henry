var assert = require('assert');
var nock = require('nock');
var henry = require('../lib/henry');

// Keep fixture generation literal to allow for easy adjustment.
var v1 = {
  "Code" : "Success",
  "LastUpdated" : "2012-12-12T21:04:14Z",
  "Type" : "AWS-HMAC",
  "AccessKeyId" : "XXX",
  "SecretAccessKey" : "XXX",
  "Token" : "XXX",
  "Expiration" : "XXX"
};

var v2 = {
  "Code" : "Success",
  "LastUpdated" : "2012-12-12T21:04:14Z",
  "Type" : "AWS-HMAC",
  "AccessKeyId" : "YYY",
  "SecretAccessKey" : "YYY",
  "Token" : "YYY",
  "Expiration" : "YYY"
};

var v3 = {
  "Code" : "Success",
  "LastUpdated" : "2012-12-12T21:04:14Z",
  "Type" : "AWS-HMAC",
  "AccessKeyId" : "ZZZ",
  "SecretAccessKey" : "ZZZ",
  "Token" : "ZZZ",
  "Expiration" : "ZZZ"
};

// Mock client of AWS metadata API
var metadata = nock('http://169.254.169.254')
  // First fetch
  .get('/latest/meta-data/iam/security-credentials/')
  .reply(200, 'role1')
  .get('/latest/meta-data/iam/security-credentials/role1')
  .reply(200, v1)
  // Second fetch
  .get('/latest/meta-data/iam/security-credentials/')
  .reply(200, 'role1')
  .get('/latest/meta-data/iam/security-credentials/role1')
  .reply(200, v2)
  // Third fetch, non 200 on outer call
  .get('/latest/meta-data/iam/security-credentials/')
  .reply(500, 'role1')
  // Fourth fetch, non 200 on inner call
  .get('/latest/meta-data/iam/security-credentials/')
  .reply(200, 'role1')
  .get('/latest/meta-data/iam/security-credentials/role1')
  .reply(500, '')
  // Fifth fetch, update credentials on setInterval
  .get('/latest/meta-data/iam/security-credentials/')
  .reply(200, 'role1')
  .get('/latest/meta-data/iam/security-credentials/role1')
  .reply(200, v3)
  // Fifth fetch, update credentials on setInterval
  .get('/latest/meta-data/iam/security-credentials/')
  .reply(200, 'role1')
  .get('/latest/meta-data/iam/security-credentials/role1')
  .reply(200, v1);

describe('henry wrapper', function() {
        var client = {};
        var client2 = {
            key: 'foo'
        };
        var client3 = {
            awsKey: 'foo'
        };
        var client4 = {
            awsKey: null,
            awsSecret: null
        };
    it('should fetch credentials when instantiated', function(done) {
        henry(client, function(err, client) {
            assert.equal(client.key, 'XXX');
            assert.equal(client.secret, 'XXX');
            assert.equal(client.token, 'XXX');
            done(err);
        });
    })
    it('should not fetch credentials when key is set', function(done) {
        henry(client2, function(err, client) {
            assert.equal(client.key, 'foo');
            done(err);
        });
    })
    it('should not fetch credentials when key is set, custom props', function(done) {
        henry(client3, ['awsKey'], function(err, client) {
            assert.equal(client.awsKey, 'foo');
            done(err);
        });
    })
    it('should update the client with new credentials', function(done) {
        henry.updateClient(client, function(err, client) {
            assert.equal(client.key, 'YYY');
            assert.equal(client.secret, 'YYY');
            assert.equal(client.token, 'YYY');
            done(err);
        });
    })
    it('should use same credentials on non-200 from metadata API outer call', function(done) {
        henry.updateClient(client, function(err, client) {
            assert.equal(client.key, 'YYY');
            assert.equal(client.secret, 'YYY');
            assert.equal(client.token, 'YYY');
            done(err);
        });
    })
    it('should use same credentials on non-200 from metadata API inner call', function(done) {
        henry.updateClient(client, function(err, client) {
            assert.equal(client.key, 'YYY');
            assert.equal(client.secret, 'YYY');
            assert.equal(client.token, 'YYY');
            done(err);
        });
    })
    it('should update credentials on setInterval', function(done) {
        henry.registerClient(client, false, 200);
        setTimeout(function() {
            assert.equal(client.key, 'ZZZ');
            assert.equal(client.secret, 'ZZZ');
            assert.equal(client.token, 'ZZZ');
            done();
        }, 300);
    })
    it('should update the client with new credentials, using custom props', function(done) {
        henry.updateClient(client,
          ['awsKey', 'awsSecret', 'awsToken', 'awsExpiration'], function(err, client) {
            assert.equal(client.awsKey, 'XXX');
            assert.equal(client.awsSecret, 'XXX');
            assert.equal(client.awsToken, 'XXX');
            assert.equal(client.awsExpiration, 'XXX');
            done(err);
        });
    })
});
