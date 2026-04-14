var http = require('http')
var aws4 = require('aws4')
var once = require('once')

function buildTargetOpts (version, target, data) {
  return {
    headers: {
      'Content-Type': 'application/x-amz-json-1.0',
      'X-Amz-Target': version + '.' + target,
    },
    body: JSON.stringify(data),
  }
}

function createLegacyRequestApi (deps) {
  var startGlobalServer = deps.startGlobalServer
  var requestOpts = deps.requestOpts
  var useRemoteDynamo = deps.useRemoteDynamo
  var version = deps.version
  var maxRetries = deps.maxRetries

  function opts (target, data) {
    return buildTargetOpts(version, target, data)
  }

  // Legacy request function used by the old helpers exported from `test/helpers.js`.
  function request (reqOpts, cb) {
    if (typeof reqOpts === 'function') { cb = reqOpts; reqOpts = {} }

    // Ensure global server is started for legacy tests.
    startGlobalServer(function (err) {
      if (err) return cb(err)

      reqOpts.retries = reqOpts.retries || 0
      cb = once(cb)

      for (var key in requestOpts) {
        if (reqOpts[key] === undefined)
          reqOpts[key] = requestOpts[key]
      }

      if (!reqOpts.noSign) {
        aws4.sign(reqOpts)
        reqOpts.noSign = true // don't sign twice if calling recursively
      }

      http.request(reqOpts, function (res) {
        res.setEncoding('utf8')
        res.on('error', cb)
        res.rawBody = ''
        res.on('data', function (chunk) { res.rawBody += chunk })
        res.on('end', function () {
          try {
            res.body = JSON.parse(res.rawBody)
          }
          catch {
            res.body = res.rawBody
          }

          if (useRemoteDynamo && reqOpts.retries <= maxRetries &&
              (res.body.__type == 'com.amazon.coral.availability#ThrottlingException' ||
              res.body.__type == 'com.amazonaws.dynamodb.v20120810#LimitExceededException')) {
            reqOpts.retries++
            return setTimeout(request, Math.floor(Math.random() * 1000), reqOpts, cb)
          }

          cb(null, res)
        })
      }).on('error', function (err) {
        if (err && ~[ 'ECONNRESET', 'EMFILE', 'ENOTFOUND' ].indexOf(err.code) && reqOpts.retries <= maxRetries) {
          reqOpts.retries++
          return setTimeout(request, Math.floor(Math.random() * 100), reqOpts, cb)
        }
        cb(err)
      }).end(reqOpts.body)
    })
  }

  function assertSerialization (target, data, msg, done) {
    request(opts(target, data), function (err, res) {
      if (err) return done(err)
      should(res.statusCode).equal(400)
      should(res.body).eql({
        __type: 'com.amazon.coral.service#SerializationException',
        Message: msg,
      })
      done()
    })
  }

  return {
    request: request,
    opts: opts,
    assertSerialization: assertSerialization,
  }
}

module.exports = {
  buildTargetOpts: buildTargetOpts,
  createLegacyRequestApi: createLegacyRequestApi,
}
