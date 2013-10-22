[![Build Status](https://travis-ci.org/mapbox/henry.png)](https://travis-ci.org/mapbox/henry)

Henry
=====

![](http://f.cl.ly/items/2u24432D210m3i0q422g/Screenshot_2_19_13_12_01_AM.png)

Henry is an agent for regularly updateing [knox][knox] and other AWS clients with
temporary credentials from the [AWS Security Token Service (STS)][sts].

> The AWS Security Token Service is a web service that enables you to request
> temporary, limited-privilege credentials for AWS Identity and Access
> Management (IAM) users or for users that you authenticate (federated users).

Henry polls the [EC2 Instance Metadata API][metadata] to fetch the most
up-to-date security credentials and makes it possible to use
[IAM Roles][roles] to delegate access to Node.js applications.

[knox]:https://github.com/LearnBoost/knox
[sts]:http://docs.aws.amazon.com/STS/latest/APIReference/Welcome.html
[metadata]:http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AESDG-chapter-instancedata.html
[roles]:http://docs.aws.amazon.com/IAM/latest/UserGuide/WorkingWithRoles.html

Usage
=====

Set up a new instance:

    var henry = new Henry({
        api: 'http://169.254.169.254',
        version: 'latest',
        interval: 3e5
    });

Create a knox client and register it with henry:

    var s3 = require('knox').createClient({
        key: 'xxx',
        secret: 'yyy',
        bucket: 'zzz'
    });
    henry.add(s3);

Henry will automatically keep the knox client up-to-date with valid
credentials. To manually refresh:

    henry.refresh(function(err, credentials) {
        if (err) throw err;
    });

API
===

## `add(client, [mapping], [callback])`

For non-knox clients provide provide a `mapping` so Henry knows what properties
to use:

    {
        key: 'customKey',
        secret: 'customSecret',
        token: 'customToken'
    }

Provide an optional `callback` function called with arguments `err` and `credentials`.

## `refresh([callback])`

Manually refresh credentials and update all registered clients.

Provide an optional `callback` function called with arguments `err` and `credentials`.

## `stop()`

Stop henry polling.

## `start()`

Start henry polling.
