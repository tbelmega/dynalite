var async = require('async')
import type {
  HelperCallback,
  HelperHttpResponse,
  HelperResponseBody,
  InstanceSafeCleanupOptions,
  InstanceTestHelper,
} from '../../../types/types';

function attachInstanceSafeCleanup (
  helper: InstanceTestHelper,
  options: InstanceSafeCleanupOptions = {},
): void {
  var deleteRemoteTables = options.deleteRemoteTables

  helper.deleteTestTables = function (done: HelperCallback): void {
    if (helper.useRemoteDynamo && !deleteRemoteTables) return done()

    var maxRetries = 3
    var retryCount = 0

    function attemptCleanup (): void {
      helper.request(helper.opts('ListTables', {}), function (err: unknown, res?: HelperHttpResponse): void {
        if (err) {
          if (retryCount < maxRetries) {
            retryCount++
            setTimeout(attemptCleanup, 1000)
            return
          }
          return done(err)
        }
        if (res == null) return done(new Error('Missing response'))

        var tableNames = getTableNames(res.body)
        if (tableNames == null) return done(new Error('Missing table names'))

        var names = tableNames.filter(function (name: string): boolean {
          return name.indexOf(helper.prefix) === 0
        })

        if (names.length === 0) {
          return done()
        }

        async.forEach(names, function (name: string, callback: HelperCallback): void {
          helper.deleteAndWaitSafe(name, callback)
        }, function (): void {
          helper.verifyTablesDeleted(names, function (verifyErr: unknown): void {
            if (verifyErr && retryCount < maxRetries) {
              retryCount++
              setTimeout(attemptCleanup, 2000)
              return
            }
            done()
          })
        })
      })
    }

    attemptCleanup()
  }

  helper.deleteAndWaitSafe = function (name: string, done: HelperCallback): void {
    var maxAttempts = 3
    var attemptCount = 0

    function attemptDelete (): void {
      attemptCount++

      helper.request(helper.opts('DeleteTable', { TableName: name }), function (err: unknown, res?: HelperHttpResponse): void {
        if (err) {
          if (attemptCount < maxAttempts) {
            setTimeout(attemptDelete, 1000)
            return
          }
          return done()
        }
        if (res == null || res.statusCode == null) return done()

        if (res.statusCode === 200) {
          return helper.waitUntilDeletedSafe(name, done)
        }

        if (hasDynamoErrorType(res.body, 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException')) {
          return done()
        }

        if (hasDynamoErrorType(res.body, 'com.amazonaws.dynamodb.v20120810#ResourceInUseException')) {
          if (attemptCount < maxAttempts) {
            setTimeout(attemptDelete, 2000)
            return
          }
          return done()
        }

        if (attemptCount < maxAttempts) {
          setTimeout(attemptDelete, 1000)
          return
        }

        done()
      })
    }

    attemptDelete()
  }

  helper.waitUntilDeletedSafe = function (name: string, done: HelperCallback): void {
    var maxWaitTime = 15000
    var startTime = Date.now()
    var checkInterval = 1000

    function checkDeleted (): void {
      if (Date.now() - startTime > maxWaitTime) {
        return done()
      }

      helper.request(helper.opts('DescribeTable', { TableName: name }), function (err: unknown, res?: HelperHttpResponse): void {
        if (err) {
          return done()
        }
        if (res == null || res.statusCode == null) return done()

        if (hasDynamoErrorType(res.body, 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException')) {
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

  helper.verifyTablesDeleted = function (tableNames: string[], done: HelperCallback): void {
    var maxVerifyRetries = 3
    var verifyRetryCount = 0

    function verifyDeletion (): void {
      helper.request(helper.opts('ListTables', {}), function (err: unknown, res?: HelperHttpResponse): void {
        if (err) {
          if (verifyRetryCount < maxVerifyRetries) {
            verifyRetryCount++
            setTimeout(verifyDeletion, 1000)
            return
          }
          return done()
        }
        if (res == null) return done()

        var currentTables = getTableNames(res.body)
        if (currentTables == null) return done()

        var remainingTables = currentTables.filter(function (name: string): boolean {
          return tableNames.indexOf(name) !== -1
        })

        if (remainingTables.length === 0) {
          return done()
        }

        if (verifyRetryCount < maxVerifyRetries) {
          verifyRetryCount++
          setTimeout(verifyDeletion, 2000)
          return
        }

        return done()
      })
    }

    verifyDeletion()
  }
}

function getTableNames (body: HelperResponseBody): string[] | undefined {
  if (typeof body === 'string' || !Array.isArray(body.TableNames)) return
  return body.TableNames.filter(function (name: unknown): name is string {
    return typeof name === 'string'
  })
}

function hasDynamoErrorType (body: HelperResponseBody, errorType: string): boolean {
  return typeof body !== 'string' && body.__type === errorType
}

module.exports = {
  attachInstanceSafeCleanup: attachInstanceSafeCleanup,
}
