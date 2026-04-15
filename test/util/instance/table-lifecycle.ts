import type {
  DescribeTableResponseBody,
  HelperCallback,
  HelperHttpResponse,
  HelperResponseCallback,
  HelperResponseBody,
  HelperTableDefinition,
  InstanceTestHelper,
} from '../../../types/types';

function attachInstanceTableLifecycle (helper: InstanceTestHelper): void {
  helper.createAndWait = function (table: HelperTableDefinition, done: HelperResponseCallback): void {
    helper.request(helper.opts('CreateTable', table), function (err: unknown, res?: HelperHttpResponse): void {
      if (err) return done(err)
      if (res == null || res.statusCode == null) return done(new Error('Missing response statusCode'))
      if (res.statusCode != 200) return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      setTimeout(helper.waitUntilActive, 1000, table.TableName, done)
    })
  }

  helper.createAndWaitWithRetry = function (table: HelperTableDefinition, done: HelperResponseCallback): void {
    var maxRetries = 5
    var retryDelay = 1000
    var retryCount = 0

    function attemptCreate (): void {
      helper.request(helper.opts('DescribeTable', { TableName: table.TableName }), function (err: unknown, res?: HelperHttpResponse): void {
        var describeBody = getDescribeTableBody(res)
        if (!err && res != null && res.statusCode === 200 && describeBody?.Table) {
          return helper.waitUntilActive(table.TableName, done)
        }

        if (err || res == null || res.statusCode == null || (res.statusCode !== 400 && res.statusCode !== 200)) {
          if (retryCount < maxRetries) {
            retryCount++
            setTimeout(attemptCreate, retryDelay * retryCount)
            return
          }
          return done(err || new Error('Server error: ' + (res == null ? 'unknown' : res.statusCode)))
        }

        if (res.statusCode === 200 && !describeBody?.Table) {
          helper.deleteAndWait(table.TableName, function () {
            createTable()
          })
          return
        }

        if (res.statusCode === 400 && describeBody?.__type === 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException') {
          return createTable()
        }

        if (retryCount < maxRetries) {
          retryCount++
          setTimeout(attemptCreate, retryDelay * retryCount)
          return
        }
        return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      })

      function createTable (): void {
        helper.request(helper.opts('CreateTable', table), function (err: unknown, res?: HelperHttpResponse): void {
          if (err) {
            if (retryCount < maxRetries) {
              retryCount++
              setTimeout(attemptCreate, retryDelay * retryCount)
              return
            }
            return done(err)
          }

          if (res == null || res.statusCode == null) {
            return done(new Error('Missing response statusCode'))
          }

          if (res.statusCode === 200) {
            setTimeout(helper.waitUntilActive, 2000, table.TableName, done)
            return
          }

          if (hasDynamoErrorType(res.body, 'com.amazonaws.dynamodb.v20120810#ResourceInUseException')) {
            if (retryCount < maxRetries) {
              retryCount++
              setTimeout(attemptCreate, retryDelay * retryCount)
              return
            }
            return done(new Error('Table creation failed after ' + maxRetries + ' retries: ResourceInUseException'))
          }

          if (retryCount < maxRetries) {
            retryCount++
            setTimeout(attemptCreate, retryDelay * retryCount)
            return
          }
          return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
        })
      }
    }

    attemptCreate()
  }

  helper.deleteAndWait = function (name: string, done: HelperCallback): void {
    var maxRetries = 10
    var retryDelay = 1000
    var retryCount = 0

    function attemptDelete (): void {
      helper.request(helper.opts('DeleteTable', { TableName: name }), function (err: unknown, res?: HelperHttpResponse): void {
        if (err) {
          if (retryCount < maxRetries) {
            retryCount++
            setTimeout(attemptDelete, retryDelay)
            return
          }
          return done(err)
        }

        if (res == null || res.statusCode == null) {
          return done(new Error('Missing response statusCode'))
        }

        if (res.statusCode === 200) {
          setTimeout(helper.waitUntilDeleted, 1000, name, done)
          return
        }

        if (hasDynamoErrorType(res.body, 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException')) {
          return done()
        }

        if (hasDynamoErrorType(res.body, 'com.amazonaws.dynamodb.v20120810#ResourceInUseException')) {
          if (retryCount < maxRetries) {
            retryCount++
            setTimeout(attemptDelete, retryDelay * Math.min(retryCount, 3))
            return
          }
          return done(new Error('Table deletion failed after ' + maxRetries + ' retries: ResourceInUseException'))
        }

        if (retryCount < maxRetries) {
          retryCount++
          setTimeout(attemptDelete, retryDelay)
          return
        }
        return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      })
    }

    attemptDelete()
  }

  helper.waitUntilActive = function (name: string, done: HelperResponseCallback): void {
    var maxWaitTime = 60000
    var startTime = Date.now()
    var checkInterval = 1000

    function checkActive (): void {
      if (Date.now() - startTime > maxWaitTime) {
        return done(new Error('Timeout waiting for table ' + name + ' to become active'))
      }

      helper.request(helper.opts('DescribeTable', { TableName: name }), function (err: unknown, res?: HelperHttpResponse): void {
        if (err) return done(err)
        if (res == null || res.statusCode == null) return done(new Error('Missing response statusCode'))

        if (res.statusCode !== 200) {
          return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
        }

        var describeBody = getDescribeTableBody(res)
        if (!describeBody?.Table) {
          setTimeout(checkActive, checkInterval)
          return
        }

        var table = describeBody.Table
        var isActive = table.TableStatus === 'ACTIVE'
        var indexesActive = !table.GlobalSecondaryIndexes ||
          table.GlobalSecondaryIndexes.every(function (index): boolean {
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

  helper.waitUntilDeleted = function (name: string, done: HelperResponseCallback): void {
    var maxWaitTime = 30000
    var startTime = Date.now()
    var checkInterval = 1000

    function checkDeleted (): void {
      if (Date.now() - startTime > maxWaitTime) {
        return done(new Error('Timeout waiting for table ' + name + ' to be deleted'))
      }

      helper.request(helper.opts('DescribeTable', { TableName: name }), function (err: unknown, res?: HelperHttpResponse): void {
        if (err) return done(err)
        if (res == null || res.statusCode == null) return done(new Error('Missing response statusCode'))

        if (hasDynamoErrorType(res.body, 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException')) {
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

  helper.waitUntilIndexesActive = function (name: string, done: HelperResponseCallback): void {
    helper.request(helper.opts('DescribeTable', { TableName: name }), function (err: unknown, res?: HelperHttpResponse): void {
      if (err) return done(err)
      if (res == null || res.statusCode == null) return done(new Error('Missing response statusCode'))
      if (res.statusCode != 200) {
        return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      }
      var describeBody = getDescribeTableBody(res)
      if (describeBody?.Table?.GlobalSecondaryIndexes?.every(function (index): boolean { return index.IndexStatus == 'ACTIVE' })) {
        return done(null, res)
      }
      setTimeout(helper.waitUntilIndexesActive, 1000, name, done)
    })
  }

  helper.deleteWhenActive = function (name: string, done: HelperCallback = function (): void {}): void {
    helper.waitUntilActive(name, function (err: unknown): void {
      if (err) return done(err)
      helper.request(helper.opts('DeleteTable', { TableName: name }), done)
    })
  }
}

function getDescribeTableBody (res?: HelperHttpResponse): DescribeTableResponseBody | undefined {
  if (res == null || typeof res.body === 'string') return
  return res.body
}

function hasDynamoErrorType (body: HelperResponseBody, errorType: string): boolean {
  return typeof body !== 'string' && body.__type === errorType
}

module.exports = {
  attachInstanceTableLifecycle: attachInstanceTableLifecycle,
}
