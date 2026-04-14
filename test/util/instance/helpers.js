var http = require('http')
var async = require('async')
var requestHelpers = require('./request')
var safeCleanup = require('./safe-cleanup')
var tableLifecycle = require('./table-lifecycle')

var useRemoteDynamo = process.env.REMOTE
var runSlowTests = true
if (useRemoteDynamo && !process.env.SLOW_TESTS) runSlowTests = false

http.globalAgent.maxSockets = Infinity

// TestHelpers factory function to encapsulate server and database management
function createTestHelper (options) {
  options = options || {}

  var helper = {
    options: options,
    server: null,
    port: options.port || getRandomPort(),
    useRemoteDynamo: options.useRemoteDynamo || useRemoteDynamo,
    awsRegion: options.awsRegion || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    awsAccountId: options.awsAccountId || process.env.AWS_ACCOUNT_ID,
    version: options.version || 'DynamoDB_20120810',
    prefix: options.prefix || '__dynalite_test_',
    readCapacity: options.readCapacity || 10,
    writeCapacity: options.writeCapacity || 5,
    runSlowTests: options.runSlowTests !== undefined ? options.runSlowTests : runSlowTests,
  }

  function getRandomPort () {
    return 10000 + Math.round(Math.random() * 10000)
  }

  helper.randomString = function () {
    return ('AAAAAAAAA' + helper.randomNumber()).slice(-10)
  }

  helper.randomNumber = function () {
    return String(Math.random() * 0x100000000)
  }

  helper.randomName = function () {
    return helper.prefix + helper.randomString()
  }

  // Generate table names (after helper functions are defined)
  helper.testHashTable = helper.useRemoteDynamo ? '__dynalite_test_1' : helper.randomName()
  helper.testHashNTable = helper.useRemoteDynamo ? '__dynalite_test_2' : helper.randomName()
  helper.testRangeTable = helper.useRemoteDynamo ? '__dynalite_test_3' : helper.randomName()
  helper.testRangeNTable = helper.useRemoteDynamo ? '__dynalite_test_4' : helper.randomName()
  helper.testRangeBTable = helper.useRemoteDynamo ? '__dynalite_test_5' : helper.randomName()

  // Set up request options
  helper.requestOpts = helper.useRemoteDynamo ?
    { host: 'dynamodb.' + helper.awsRegion + '.amazonaws.com', method: 'POST' } :
    { host: '127.0.0.1', port: helper.port, method: 'POST' }

  requestHelpers.attachInstanceRequest(helper)

  helper.getAccountId = function (done) {
    helper.request(helper.opts('DescribeTable', { TableName: helper.testHashTable }), function (err, res) {
      if (err) return done(err)
      helper.awsAccountId = res.body.Table.TableArn.split(':')[4]
      done()
    })
  }
  safeCleanup.attachInstanceSafeCleanup(helper, {
    deleteRemoteTables: DELETE_REMOTE_TABLES,
  })
  tableLifecycle.attachInstanceTableLifecycle(helper)

  helper.createTestTables = function (done) {
    if (helper.useRemoteDynamo && !CREATE_REMOTE_TABLES) return done()

    // First, ensure any existing test tables are cleaned up
    helper.deleteTestTables(function (err) {
      if (err) return done(err)

      var readCapacity = helper.readCapacity, writeCapacity = helper.writeCapacity
      var tables = [ {
        TableName: helper.testHashTable,
        AttributeDefinitions: [ { AttributeName: 'a', AttributeType: 'S' } ],
        KeySchema: [ { KeyType: 'HASH', AttributeName: 'a' } ],
        ProvisionedThroughput: { ReadCapacityUnits: readCapacity, WriteCapacityUnits: writeCapacity },
      }, {
        TableName: helper.testHashNTable,
        AttributeDefinitions: [ { AttributeName: 'a', AttributeType: 'N' } ],
        KeySchema: [ { KeyType: 'HASH', AttributeName: 'a' } ],
        BillingMode: 'PAY_PER_REQUEST',
      }, {
        TableName: helper.testRangeTable,
        AttributeDefinitions: [
          { AttributeName: 'a', AttributeType: 'S' },
          { AttributeName: 'b', AttributeType: 'S' },
          { AttributeName: 'c', AttributeType: 'S' },
          { AttributeName: 'd', AttributeType: 'S' },
        ],
        KeySchema: [ { KeyType: 'HASH', AttributeName: 'a' }, { KeyType: 'RANGE', AttributeName: 'b' } ],
        ProvisionedThroughput: { ReadCapacityUnits: readCapacity, WriteCapacityUnits: writeCapacity },
        LocalSecondaryIndexes: [ {
          IndexName: 'index1',
          KeySchema: [ { AttributeName: 'a', KeyType: 'HASH' }, { AttributeName: 'c', KeyType: 'RANGE' } ],
          Projection: { ProjectionType: 'ALL' },
        }, {
          IndexName: 'index2',
          KeySchema: [ { AttributeName: 'a', KeyType: 'HASH' }, { AttributeName: 'd', KeyType: 'RANGE' } ],
          Projection: { ProjectionType: 'INCLUDE', NonKeyAttributes: [ 'c' ] },
        } ],
        GlobalSecondaryIndexes: [ {
          IndexName: 'index3',
          KeySchema: [ { AttributeName: 'c', KeyType: 'HASH' } ],
          ProvisionedThroughput: { ReadCapacityUnits: readCapacity, WriteCapacityUnits: writeCapacity },
          Projection: { ProjectionType: 'ALL' },
        }, {
          IndexName: 'index4',
          KeySchema: [ { AttributeName: 'c', KeyType: 'HASH' }, { AttributeName: 'd', KeyType: 'RANGE' } ],
          ProvisionedThroughput: { ReadCapacityUnits: readCapacity, WriteCapacityUnits: writeCapacity },
          Projection: { ProjectionType: 'INCLUDE', NonKeyAttributes: [ 'e' ] },
        } ],
      }, {
        TableName: helper.testRangeNTable,
        AttributeDefinitions: [ { AttributeName: 'a', AttributeType: 'S' }, { AttributeName: 'b', AttributeType: 'N' } ],
        KeySchema: [ { KeyType: 'HASH', AttributeName: 'a' }, { KeyType: 'RANGE', AttributeName: 'b' } ],
        ProvisionedThroughput: { ReadCapacityUnits: readCapacity, WriteCapacityUnits: writeCapacity },
      }, {
        TableName: helper.testRangeBTable,
        AttributeDefinitions: [ { AttributeName: 'a', AttributeType: 'S' }, { AttributeName: 'b', AttributeType: 'B' } ],
        KeySchema: [ { KeyType: 'HASH', AttributeName: 'a' }, { KeyType: 'RANGE', AttributeName: 'b' } ],
        ProvisionedThroughput: { ReadCapacityUnits: readCapacity, WriteCapacityUnits: writeCapacity },
      } ]

      async.forEach(tables, helper.createAndWaitWithRetry, done)
    })
  }

  helper.clearTable = function (name, keyNames, segments, done) {
    if (!done) { done = segments; segments = 2 }
    if (!Array.isArray(keyNames)) keyNames = [ keyNames ]

    function scanAndDelete (cb) {
      async.times(segments, function (n, cb) {
        helper.scanSegmentAndDelete(name, keyNames, segments, n, cb)
      }, function (err, segmentsHadKeys) {
        if (err) return cb(err)
        if (segmentsHadKeys.some(Boolean)) return scanAndDelete(cb)
        cb()
      })
    }

    scanAndDelete(done)
  }

  helper.scanSegmentAndDelete = function (tableName, keyNames, totalSegments, n, cb) {
    helper.request(helper.opts('Scan', { TableName: tableName, AttributesToGet: keyNames, Segment: n, TotalSegments: totalSegments }), function (err, res) {
      if (err) return cb(err)
      if (/ProvisionedThroughputExceededException/.test(res.body.__type)) {
        console.log('ProvisionedThroughputExceededException')
        return setTimeout(helper.scanSegmentAndDelete, 2000, tableName, keyNames, totalSegments, n, cb)
      }
      else if (res.statusCode != 200) {
        return cb(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      }
      if (!res.body.ScannedCount) return cb(null, false)

      var keys = res.body.Items, batchDeletes

      for (batchDeletes = []; keys.length; keys = keys.slice(25))
        batchDeletes.push(function (keys) {
          return function (cb) { helper.batchWriteUntilDone(tableName, { deletes: keys }, cb) }
        }(keys.slice(0, 25)))

      async.parallel(batchDeletes, function (err) {
        if (err) return cb(err)
        cb(null, true)
      })
    })
  }

  helper.replaceTable = function (name, keyNames, items, segments, done) {
    if (!done) { done = segments; segments = 2 }

    helper.clearTable(name, keyNames, segments, function (err) {
      if (err) return done(err)
      helper.batchBulkPut(name, items, segments, done)
    })
  }

  helper.batchBulkPut = function (name, items, segments, done) {
    if (!done) { done = segments; segments = 2 }

    var itemChunks = [], i
    for (i = 0; i < items.length; i += 25)
      itemChunks.push(items.slice(i, i + 25))

    async.eachLimit(itemChunks, segments, function (items, cb) { helper.batchWriteUntilDone(name, { puts: items }, cb) }, done)
  }

  helper.batchWriteUntilDone = function (name, actions, cb) {
    var batchReq = { RequestItems: {} }, batchRes = {}
    batchReq.RequestItems[name] = (actions.puts || []).map(function (item) { return { PutRequest: { Item: item } } })
      .concat((actions.deletes || []).map(function (key) { return { DeleteRequest: { Key: key } } }))

    async.doWhilst(
      function (cb) {
        helper.request(helper.opts('BatchWriteItem', batchReq), function (err, res) {
          if (err) return cb(err)
          batchRes = res
          if (res.body.UnprocessedItems && Object.keys(res.body.UnprocessedItems).length) {
            batchReq.RequestItems = res.body.UnprocessedItems
          }
          else if (/ProvisionedThroughputExceededException/.test(res.body.__type)) {
            console.log('ProvisionedThroughputExceededException')
            return setTimeout(cb, 2000)
          }
          else if (res.statusCode != 200) {
            return cb(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
          }
          cb()
        })
      },
      function (cb) {
        var result = (batchRes.body.UnprocessedItems && Object.keys(batchRes.body.UnprocessedItems).length) ||
        /ProvisionedThroughputExceededException/.test(batchRes.body.__type)
        cb(null, result)
      },
      cb,
    )
  }

  return helper
}

// Keep these flags module-local (and overrideable via env) for instance helpers.
var CREATE_REMOTE_TABLES = true
var DELETE_REMOTE_TABLES = true

module.exports = {
  createTestHelper: createTestHelper,
}
