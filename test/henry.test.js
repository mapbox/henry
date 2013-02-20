var assert = require('assert');
var nock = require('nock');
var Henry = require('../lib/henry');

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

describe('henry wrapper', function() {
    before(function() {
        // Mock client of AWS metadata API
        this.nock = nock('http://169.254.169.254')
            .get('/latest/meta-data/iam/security-credentials/')
            .reply(200, 'role1')
            .get('/latest/meta-data/iam/security-credentials/role1')
            .reply(200, v1);
        this.henry = new Henry();
    });
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
        this.nock
            .get('/latest/meta-data/iam/security-credentials/')
            .reply(200, 'role1')
            .get('/latest/meta-data/iam/security-credentials/role1')
            .reply(200, v1);
        this.henry.add(client, function(err) {
            assert.equal(client.key, 'XXX');
            assert.equal(client.secret, 'XXX');
            assert.equal(client.token, 'XXX');
            done(err);
        });
    })
    it('should refresh the client with new credentials', function(done) {
        this.nock
            .get('/latest/meta-data/iam/security-credentials/')
            .reply(200, 'role1')
            .get('/latest/meta-data/iam/security-credentials/role1')
            .reply(200, v2)
        this.henry.refresh(function(err, credentials) {
            assert.equal(client.key, 'YYY');
            assert.equal(client.secret, 'YYY');
            assert.equal(client.token, 'YYY');
            done(err);
        });
    })
    it('should use same credentials on non-200 from metadata API outer call', function(done) {
        this.nock
            .get('/latest/meta-data/iam/security-credentials/')
            .reply(500, 'role1')
        this.henry.refresh(function(err, credentials) {
            if (err.code != 500) return done(err);
            assert.equal(client.key, 'YYY');
            assert.equal(client.secret, 'YYY');
            assert.equal(client.token, 'YYY');
            done();
        });
    })
    it('should use same credentials on non-200 from metadata API inner call', function(done) {
        this.nock
            .get('/latest/meta-data/iam/security-credentials/')
            .reply(200, 'role1')
            .get('/latest/meta-data/iam/security-credentials/role1')
            .reply(500, '')
        this.henry.refresh(function(err, credentials) {
            if (err.code != 500) return done(err);
            assert.equal(client.key, 'YYY');
            assert.equal(client.secret, 'YYY');
            assert.equal(client.token, 'YYY');
            done();
        });
    })
    it('should update credentials on setInterval', function(done) {
        this.nock
            .get('/latest/meta-data/iam/security-credentials/')
            .reply(200, 'role1')
            .get('/latest/meta-data/iam/security-credentials/role1')
            .reply(200, v1)
            .get('/latest/meta-data/iam/security-credentials/')
            .reply(200, 'role1')
            .get('/latest/meta-data/iam/security-credentials/role1')
            .reply(200, v1)
            .get('/latest/meta-data/iam/security-credentials/')
            .reply(200, 'role1')
            .get('/latest/meta-data/iam/security-credentials/role1')
            .reply(200, v3)
        var henry = new Henry({ interval: 500 });
        henry.add(client, function(err, credentials) {
            assert.equal(client.key, 'XXX');
            assert.equal(client.secret, 'XXX');
            assert.equal(client.token, 'XXX');
            setTimeout(function() {
                assert.equal(client.key, 'ZZZ');
                assert.equal(client.secret, 'ZZZ');
                assert.equal(client.token, 'ZZZ');
                done();
            }, 1000);
        });
    })
    it('should update the client with new credentials, using custom props', function(done) {
        this.nock
            .get('/latest/meta-data/iam/security-credentials/')
            .reply(200, 'role1')
            .get('/latest/meta-data/iam/security-credentials/role1')
            .reply(200, v1);
        this.henry.add(client, {
            key: 'awsKey',
            secret: 'awsSecret',
            token: 'awsToken',
            expiration: 'awsExpiration'
        }, function(err) {
            assert.equal(client.awsKey, 'XXX');
            assert.equal(client.awsSecret, 'XXX');
            assert.equal(client.awsToken, 'XXX');
            assert.equal(client.awsExpiration, 'XXX');
            done(err);
        });
    })
});
