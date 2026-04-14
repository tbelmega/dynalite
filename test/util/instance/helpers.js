var http = require('http')
var async = require('async')
var requestHelpers = require('./request')
var safeCleanup = require('./safe-cleanup')
var tableLifecycle = require('./table-lifecycle')
var tableData = require('./table-data')

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
  tableData.attachInstanceTableData(helper)

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

  return helper
}

// Keep these flags module-local (and overrideable via env) for instance helpers.
var CREATE_REMOTE_TABLES = true
var DELETE_REMOTE_TABLES = true

module.exports = {
  createTestHelper: createTestHelper,
}
