// @ts-nocheck
var async = require('async')

function attachInstanceSafeCleanup (helper, options) {
  options = options || {}
  var deleteRemoteTables = options.deleteRemoteTables

  helper.deleteTestTables = function (done) {
    if (helper.useRemoteDynamo && !deleteRemoteTables) return done()

    var maxRetries = 3
    var retryCount = 0

    function attemptCleanup () {
      helper.request(helper.opts('ListTables', {}), function (err, res) {
        if (err) {
          if (retryCount < maxRetries) {
            retryCount++
            return setTimeout(attemptCleanup, 1000)
          }
          return done(err)
        }

        var names = res.body.TableNames.filter(function (name) {
          return name.indexOf(helper.prefix) === 0
        })

        if (names.length === 0) {
          return done()
        }

        async.forEach(names, function (name, callback) {
          helper.deleteAndWaitSafe(name, callback)
        }, function () {
          helper.verifyTablesDeleted(names, function (verifyErr) {
            if (verifyErr && retryCount < maxRetries) {
              retryCount++
              return setTimeout(attemptCleanup, 2000)
            }
            done()
          })
        })
      })
    }

    attemptCleanup()
  }

  helper.deleteAndWaitSafe = function (name, done) {
    var maxAttempts = 3
    var attemptCount = 0

    function attemptDelete () {
      attemptCount++

      helper.request(helper.opts('DeleteTable', { TableName: name }), function (err, res) {
        if (err) {
          if (attemptCount < maxAttempts) {
            return setTimeout(attemptDelete, 1000)
          }
          return done()
        }

        if (res.statusCode === 200) {
          return helper.waitUntilDeletedSafe(name, done)
        }

        if (res.body && res.body.__type === 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException') {
          return done()
        }

        if (res.body && res.body.__type === 'com.amazonaws.dynamodb.v20120810#ResourceInUseException') {
          if (attemptCount < maxAttempts) {
            return setTimeout(attemptDelete, 2000)
          }
          return done()
        }

        if (attemptCount < maxAttempts) {
          return setTimeout(attemptDelete, 1000)
        }

        done()
      })
    }

    attemptDelete()
  }

  helper.waitUntilDeletedSafe = function (name, done) {
    var maxWaitTime = 15000
    var startTime = Date.now()
    var checkInterval = 1000

    function checkDeleted () {
      if (Date.now() - startTime > maxWaitTime) {
        return done()
      }

      helper.request(helper.opts('DescribeTable', { TableName: name }), function (err, res) {
        if (err) {
          return done()
        }

        if (res.body && res.body.__type === 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException') {
          return done()
        }

        if (res.statusCode !== 200) {
          return done()
        }

        setTimeout(checkDeleted, checkInterval)
      })
    }

    checkDeleted()
  }

  helper.verifyTablesDeleted = function (tableNames, done) {
    var maxVerifyRetries = 3
    var verifyRetryCount = 0

    function verifyDeletion () {
      helper.request(helper.opts('ListTables', {}), function (err, res) {
        if (err) {
          if (verifyRetryCount < maxVerifyRetries) {
            verifyRetryCount++
            return setTimeout(verifyDeletion, 1000)
          }
          return done()
        }

        var remainingTables = res.body.TableNames.filter(function (name) {
          return tableNames.indexOf(name) !== -1
        })

        if (remainingTables.length === 0) {
          return done()
        }

        if (verifyRetryCount < maxVerifyRetries) {
          verifyRetryCount++
          return setTimeout(verifyDeletion, 2000)
        }

        return done()
      })
    }

    verifyDeletion()
  }
}

module.exports = {
  attachInstanceSafeCleanup: attachInstanceSafeCleanup,
}
