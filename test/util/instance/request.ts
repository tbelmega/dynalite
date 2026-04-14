// @ts-nocheck
var http = require('http')
var aws4 = require('aws4')
var once = require('once')
var dynalite = require('../../../..')

function attachInstanceRequest (helper) {
  helper.startServer = function () {
    return new Promise(function (resolve, reject) {
      if (helper.useRemoteDynamo) {
        helper.createTestTables(function (err) {
          if (err) return reject(err)
          helper.getAccountId(resolve)
        })
        return
      }

      helper.server = dynalite({ path: process.env.DYNALITE_PATH })
      helper.server.listen(helper.port, function (err) {
        if (err) return reject(err)
        helper.createTestTables(function (err) {
          if (err) return reject(err)
          helper.getAccountId(resolve)
        })
      })
    })
  }

  helper.stopServer = function () {
    return new Promise(function (resolve, reject) {
      helper.deleteTestTables(function (err) {
        if (err) return reject(err)
        if (helper.server) {
          helper.server.close(resolve)
        }
        else {
          resolve()
        }
      })
    })
  }

  helper.request = function (opts, cb) {
    if (typeof opts === 'function') { cb = opts; opts = {} }
    opts.retries = opts.retries || 0
    cb = once(cb)
    for (var key in helper.requestOpts) {
      if (opts[key] === undefined)
        opts[key] = helper.requestOpts[key]
    }
    if (!opts.noSign) {
      aws4.sign(opts)
      opts.noSign = true
    }

    var MAX_RETRIES = 20
    http.request(opts, function (res) {
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
        if (helper.useRemoteDynamo && opts.retries <= MAX_RETRIES &&
            (res.body.__type == 'com.amazon.coral.availability#ThrottlingException' ||
            res.body.__type == 'com.amazonaws.dynamodb.v20120810#LimitExceededException')) {
          opts.retries++
          return setTimeout(helper.request, Math.floor(Math.random() * 1000), opts, cb)
        }
        cb(null, res)
      })
    }).on('error', function (err) {
      if (err && ~[ 'ECONNRESET', 'EMFILE', 'ENOTFOUND' ].indexOf(err.code) && opts.retries <= MAX_RETRIES) {
        opts.retries++
        return setTimeout(helper.request, Math.floor(Math.random() * 100), opts, cb)
      }
      cb(err)
    }).end(opts.body)
  }

  helper.opts = function (target, data) {
    return {
      headers: {
        'Content-Type': 'application/x-amz-json-1.0',
        'X-Amz-Target': helper.version + '.' + target,
      },
      body: JSON.stringify(data),
    }
  }
}

module.exports = {
  attachInstanceRequest: attachInstanceRequest,
}
