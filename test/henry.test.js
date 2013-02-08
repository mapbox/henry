var assert = require('assert');
var knox = require('knox');
var nock = require('nock');
var updateClient = require('../lib/henry').updateClient;
var registerClient = require('../lib/henry').registerClient;

var expires = new Date(+new Date + 60000).toISOString();
// Keep fixture generation literal to allow for easy adjustment.
var v1 = {
  "Code" : "Success",
  "LastUpdated" : "2012-12-12T21:04:14Z",
  "Type" : "AWS-HMAC",
  "AccessKeyId" : "XXX",
  "SecretAccessKey" : "XXX",
  "Token" : "XXX",
  "Expiration" : expires
};

var v2 = {
  "Code" : "Success",
  "LastUpdated" : "2012-12-12T21:04:14Z",
  "Type" : "AWS-HMAC",
  "AccessKeyId" : "YYY",
  "SecretAccessKey" : "YYY",
  "Token" : "YYY",
  "Expiration" : expires
};

var v3 = {
  "Code" : "Success",
  "LastUpdated" : "2012-12-12T21:04:14Z",
  "Type" : "AWS-HMAC",
  "AccessKeyId" : "ZZZ",
  "SecretAccessKey" : "ZZZ",
  "Token" : "ZZZ",
  "Expiration" : expires
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
  .reply(200, v3);

describe('henry wrapper', function() {
        var client = knox.createClient({
            key: 'KEY',
            secret: 'SECRET',
            bucket: 'mybucket'
        });
    it('should fetch credentials when instantiated', function(done) {
        require('../lib/henry')(client, function(err, client) {
            assert.equal(client.key, 'XXX');
            assert.equal(client.secret, 'XXX');
            assert.equal(client.token, 'XXX');
            done(err);
        });
    })
    it('should update the client with new credentials', function(done) {
        updateClient(client, function(err, client) {
            assert.equal(client.key, 'YYY');
            assert.equal(client.secret, 'YYY');
            assert.equal(client.token, 'YYY');
            done(err);
        });
    })
    it('should use same credentials on non-200 from metadata API outer call', function(done) {
        updateClient(client, function(err, client) {
            assert.equal(client.key, 'YYY');
            assert.equal(client.secret, 'YYY');
            assert.equal(client.token, 'YYY');
            done(err);
        });
    })
    it('should use same credentials on non-200 from metadata API inner call', function(done) {
        updateClient(client, function(err, client) {
            assert.equal(client.key, 'YYY');
            assert.equal(client.secret, 'YYY');
            assert.equal(client.token, 'YYY');
            done(err);
        });
    })
    it('should update credentials on setInterval', function(done) {
        registerClient(client, false, 200);
        setTimeout(function() {
            assert.equal(client.key, 'ZZZ');
            assert.equal(client.secret, 'ZZZ');
            assert.equal(client.token, 'ZZZ');
            done();
        }, 300);
    })
});
