var assert = require('assert');
var henry = require('../lib/henry');
var nock = require('nock');
var checkCredentials = henry.checkCredentials;
var client = henry.createClient({
    bucket: 'mybucket'
});

var expires = new Date(+new Date + 60000).toISOString();
// Keep fixture generation literal to allow for easy adjustment.
var v1 = {
  "Code" : "Success",
  "LastUpdated" : "2012-12-12T21:04:14Z",
  "Type" : "AWS-HMAC",
  "AccessKeyId" : "XXX",
  "SecretAccessKey" : "XXX",
  "Token" : undefined,
  "Expiration" : expires
};

var v2 = {
  "Code" : "Success",
  "LastUpdated" : "2012-12-12T21:04:14Z",
  "Type" : "AWS-HMAC",
  "AccessKeyId" : "YYY",
  "SecretAccessKey" : "YYY",
  "Token" : undefined,
  "Expiration" : expires
};

var v3 = {
  "Code" : "Success",
  "LastUpdated" : "2012-12-12T21:04:14Z",
  "Type" : "AWS-HMAC",
  "AccessKeyId" : "ZZZ",
  "SecretAccessKey" : "ZZZ",
  "Token" : undefined,
  "Expiration" : expires
};

var v4 = {
  "Code" : "Failure",
  "LastUpdated" : "2012-12-12T21:04:14Z",
  "Type" : "AWS-HMAC",
  "AccessKeyId" : "AAA",
  "SecretAccessKey" : "AAA",
  "Token" : undefined,
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
  // Third fetch
  .get('/latest/meta-data/iam/security-credentials/')
  .reply(200, 'role1')
  .get('/latest/meta-data/iam/security-credentials/role1')
  .reply(200, v3)
  // Fourth fetch, non 200
  .get('/latest/meta-data/iam/security-credentials/')
  .reply(500, 'role1')
  // Fifth fetch, non 200 on inner call
  .get('/latest/meta-data/iam/security-credentials/')
  .reply(200, 'role1')
  .get('/latest/meta-data/iam/security-credentials/role1')
  .reply(500, '')
  // "Code" != "Success" in metadata API response
  .get('/latest/meta-data/iam/security-credentials/')
  .reply(200, 'role1')
  .get('/latest/meta-data/iam/security-credentials/role1')
  .reply(200, v4);

// Mock client of S3 api
var s3 = nock('https://mybucket.s3.amazonaws.com')
  .get('/test')
  .reply(200, 'test')
  .get('/test')
  .reply(200, 'test');

describe('henry client', function() {
    it('should set default key and secret to KEY and SECRET', function(done) {
        assert.equal(client.key, 'KEY');
        assert.equal(client.secret, 'SECRET');
        done();
    })
    it('should retrieve credentials from metadata API', function(done) {
        client.get('/test', function(err, req) {
        if (err) return done(err);
        assert.equal(client.key, 'XXX');
        assert.equal(client.secret, 'XXX');
        req.on('error', done);
        req.on('response', function(res) {
            var string = '';
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                string += chunk;
            });
            res.on('end', function() {
                assert.equal(res.statusCode, 200);
                assert.equal(string, 'test');
                done();
            });
        })
        req.end();
        });
    })
    it('should re-fetch the credentials', function(done) {
        expire();
        client.get('/test', function(err, req) {
            if (err) return done(err);
            assert.equal(client.key, 'YYY');
            assert.equal(client.secret, 'YYY');
            req.on('error', done);
            req.on('response', function(res) {
                var string = '';
                res.setEncoding('utf8');
                res.on('data', function(chunk) {
                    string += chunk;
                });
                res.on('end', function() {
                    assert.equal(res.statusCode, 200);
                    assert.equal(string, 'test');
                    done();
                });
            })
            req.end();
        });
    })
    it('should re-fetch the credentials, again', function(done) {
        checkCredentials.call(client, true, function(err, res) {
            assert.equal(client.key, 'ZZZ');
            done(err);
        });
    })
    it('should not re-fetch the credentials', function(done) {
        gainTime();
        checkCredentials.call(client, function(err, res) {
            assert.equal(client.key, 'ZZZ');
            done(err);
        });
    })
    it('should return cached credentials on non 200 from metadata API', function(done) {
        gainTime();
        checkCredentials.call(client, function(err, res) {
            assert.equal(client.key, 'ZZZ');
            done(err);
        });
    })
    it('should return cached credentials on non 200 from metadata API', function(done) {
        gainTime();
        checkCredentials.call(client, function(err, res) {
            assert.equal(client.key, 'ZZZ');
            done(err);
        });
    })
    it('should return cached credentials on "Code" != "Success" from metadata API', function(done) {
        expire();
        checkCredentials.call(client, function(err, res) {
            assert.equal(client.key, 'ZZZ');
            done(err);
        });
    })
});

function gainTime() {
    if (client.expires - +new Date() < 1) client.expires = +new Date() + 1000;
}

function expire() {
    client.expires = +new Date() - 1000;
}
