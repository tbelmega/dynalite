// @ts-nocheck
function attachInstanceTableLifecycle (helper) {
  helper.createAndWait = function (table, done) {
    helper.request(helper.opts('CreateTable', table), function (err, res) {
      if (err) return done(err)
      if (res.statusCode != 200) return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      setTimeout(helper.waitUntilActive, 1000, table.TableName, done)
    })
  }

  helper.createAndWaitWithRetry = function (table, done) {
    var maxRetries = 5
    var retryDelay = 1000
    var retryCount = 0

    function attemptCreate () {
      helper.request(helper.opts('DescribeTable', { TableName: table.TableName }), function (err, res) {
        if (!err && res.statusCode === 200 && res.body && res.body.Table) {
          return helper.waitUntilActive(table.TableName, done)
        }

        if (err || (res.statusCode !== 400 && res.statusCode !== 200)) {
          if (retryCount < maxRetries) {
            retryCount++
            return setTimeout(attemptCreate, retryDelay * retryCount)
          }
          return done(err || new Error('Server error: ' + res.statusCode))
        }

        if (res.statusCode === 200 && (!res.body || !res.body.Table)) {
          helper.deleteAndWait(table.TableName, function () {
            createTable()
          })
          return
        }

        if (res.statusCode === 400 && res.body && res.body.__type === 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException') {
          return createTable()
        }

        if (retryCount < maxRetries) {
          retryCount++
          return setTimeout(attemptCreate, retryDelay * retryCount)
        }
        return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      })

      function createTable () {
        helper.request(helper.opts('CreateTable', table), function (err, res) {
          if (err) {
            if (retryCount < maxRetries) {
              retryCount++
              return setTimeout(attemptCreate, retryDelay * retryCount)
            }
            return done(err)
          }

          if (res.statusCode === 200) {
            return setTimeout(helper.waitUntilActive, 2000, table.TableName, done)
          }

          if (res.body && res.body.__type === 'com.amazonaws.dynamodb.v20120810#ResourceInUseException') {
            if (retryCount < maxRetries) {
              retryCount++
              return setTimeout(attemptCreate, retryDelay * retryCount)
            }
            return done(new Error('Table creation failed after ' + maxRetries + ' retries: ResourceInUseException'))
          }

          if (retryCount < maxRetries) {
            retryCount++
            return setTimeout(attemptCreate, retryDelay * retryCount)
          }
          return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
        })
      }
    }

    attemptCreate()
  }

  helper.deleteAndWait = function (name, done) {
    var maxRetries = 10
    var retryDelay = 1000
    var retryCount = 0

    function attemptDelete () {
      helper.request(helper.opts('DeleteTable', { TableName: name }), function (err, res) {
        if (err) {
          if (retryCount < maxRetries) {
            retryCount++
            return setTimeout(attemptDelete, retryDelay)
          }
          return done(err)
        }

        if (res.statusCode === 200) {
          return setTimeout(helper.waitUntilDeleted, 1000, name, done)
        }

        if (res.body && res.body.__type === 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException') {
          return done()
        }

        if (res.body && res.body.__type === 'com.amazonaws.dynamodb.v20120810#ResourceInUseException') {
          if (retryCount < maxRetries) {
            retryCount++
            return setTimeout(attemptDelete, retryDelay * Math.min(retryCount, 3))
          }
          return done(new Error('Table deletion failed after ' + maxRetries + ' retries: ResourceInUseException'))
        }

        if (retryCount < maxRetries) {
          retryCount++
          return setTimeout(attemptDelete, retryDelay)
        }
        return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      })
    }

    attemptDelete()
  }

  helper.waitUntilActive = function (name, done) {
    var maxWaitTime = 60000
    var startTime = Date.now()
    var checkInterval = 1000

    function checkActive () {
      if (Date.now() - startTime > maxWaitTime) {
        return done(new Error('Timeout waiting for table ' + name + ' to become active'))
      }

      helper.request(helper.opts('DescribeTable', { TableName: name }), function (err, res) {
        if (err) return done(err)

        if (res.statusCode !== 200) {
          return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
        }

        if (!res.body || !res.body.Table) {
          setTimeout(checkActive, checkInterval)
          return
        }

        var table = res.body.Table
        var isActive = table.TableStatus === 'ACTIVE'
        var indexesActive = !table.GlobalSecondaryIndexes ||
          table.GlobalSecondaryIndexes.every(function (index) {
            return index.IndexStatus === 'ACTIVE'
          })

        if (isActive && indexesActive) {
          return done(null, res)
        }

        setTimeout(checkActive, checkInterval)
      })
    }

    checkActive()
  }

  helper.waitUntilDeleted = function (name, done) {
    var maxWaitTime = 30000
    var startTime = Date.now()
    var checkInterval = 1000

    function checkDeleted () {
      if (Date.now() - startTime > maxWaitTime) {
        return done(new Error('Timeout waiting for table ' + name + ' to be deleted'))
      }

      helper.request(helper.opts('DescribeTable', { TableName: name }), function (err, res) {
        if (err) return done(err)

        if (res.body && res.body.__type === 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException') {
          return done(null, res)
        }

        if (res.statusCode !== 200) {
          return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
        }

        setTimeout(checkDeleted, checkInterval)
      })
    }

    checkDeleted()
  }

  helper.waitUntilIndexesActive = function (name, done) {
    helper.request(helper.opts('DescribeTable', { TableName: name }), function (err, res) {
      if (err) return done(err)
      if (res.statusCode != 200)
        return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      else if (res.body.Table.GlobalSecondaryIndexes.every(function (index) { return index.IndexStatus == 'ACTIVE' }))
        return done(null, res)
      setTimeout(helper.waitUntilIndexesActive, 1000, name, done)
    })
  }

  helper.deleteWhenActive = function (name, done) {
    if (!done) done = function () { }
    helper.waitUntilActive(name, function (err) {
      if (err) return done(err)
      helper.request(helper.opts('DeleteTable', { TableName: name }), done)
    })
  }
}

module.exports = {
  attachInstanceTableLifecycle: attachInstanceTableLifecycle,
}
