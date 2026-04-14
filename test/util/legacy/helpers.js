var http = require('http'),
  async = require('async'),
  dynalite = require('../../..'),
  requestUtils = require('./request'),
  assertions = require('./assertions')

var useRemoteDynamo = process.env.REMOTE
var runSlowTests = true
if (useRemoteDynamo && !process.env.SLOW_TESTS) runSlowTests = false

http.globalAgent.maxSockets = Infinity

// Legacy global variables and exports for backward compatibility
var MAX_SIZE = 409600
var awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
var awsAccountId = process.env.AWS_ACCOUNT_ID
var version = 'DynamoDB_20120810'
var prefix = '__dynalite_test_'
var readCapacity = 10
var writeCapacity = 5
var testHashTable = useRemoteDynamo ? '__dynalite_test_1' : randomName()
var testHashNTable = useRemoteDynamo ? '__dynalite_test_2' : randomName()
var testRangeTable = useRemoteDynamo ? '__dynalite_test_3' : randomName()
var testRangeNTable = useRemoteDynamo ? '__dynalite_test_4' : randomName()
var testRangeBTable = useRemoteDynamo ? '__dynalite_test_5' : randomName()

var port = 10000 + Math.round(Math.random() * 10000),
  requestOpts = useRemoteDynamo ?
    { host: 'dynamodb.' + awsRegion + '.amazonaws.com', method: 'POST' } :
    { host: '127.0.0.1', port: port, method: 'POST' }

var CREATE_REMOTE_TABLES = true

var MAX_RETRIES = 20

var legacyRequestApi = requestUtils.createLegacyRequestApi({
  startGlobalServer: startGlobalServer,
  requestOpts: requestOpts,
  useRemoteDynamo: useRemoteDynamo,
  version: version,
  maxRetries: MAX_RETRIES,
})

var request = legacyRequestApi.request
var opts = legacyRequestApi.opts
var assertSerialization = legacyRequestApi.assertSerialization
var legacyAssertions = assertions.createLegacyAssertions({
  request: request,
  opts: opts,
  assertSerialization: assertSerialization,
})

// Global server instance for legacy tests
var globalServer = null
var globalServerStarted = false
var globalTablesCreated = false

// Get global account ID for legacy tests
function getGlobalAccountId (callback) {
  request(opts('DescribeTable', { TableName: testHashTable }), function (err, res) {
    if (err) return callback(err)
    if (res.statusCode !== 200) return callback(new Error('Failed to get account ID: ' + res.statusCode))
    if (res.body && res.body.Table && res.body.Table.TableArn) {
      awsAccountId = res.body.Table.TableArn.split(':')[4]
      exports.awsAccountId = awsAccountId
    }
    callback()
  })
}

// Create global test tables for legacy tests
function createGlobalTestTables (callback) {
  if (globalTablesCreated) return callback()
  if (useRemoteDynamo && !CREATE_REMOTE_TABLES) {
    globalTablesCreated = true
    return callback()
  }

  var tables = [ {
    TableName: testHashTable,
    AttributeDefinitions: [ { AttributeName: 'a', AttributeType: 'S' } ],
    KeySchema: [ { KeyType: 'HASH', AttributeName: 'a' } ],
    ProvisionedThroughput: { ReadCapacityUnits: readCapacity, WriteCapacityUnits: writeCapacity },
  }, {
    TableName: testHashNTable,
    AttributeDefinitions: [ { AttributeName: 'a', AttributeType: 'N' } ],
    KeySchema: [ { KeyType: 'HASH', AttributeName: 'a' } ],
    BillingMode: 'PAY_PER_REQUEST',
  }, {
    TableName: testRangeTable,
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
    TableName: testRangeNTable,
    AttributeDefinitions: [ { AttributeName: 'a', AttributeType: 'S' }, { AttributeName: 'b', AttributeType: 'N' } ],
    KeySchema: [ { KeyType: 'HASH', AttributeName: 'a' }, { KeyType: 'RANGE', AttributeName: 'b' } ],
    ProvisionedThroughput: { ReadCapacityUnits: readCapacity, WriteCapacityUnits: writeCapacity },
  }, {
    TableName: testRangeBTable,
    AttributeDefinitions: [ { AttributeName: 'a', AttributeType: 'S' }, { AttributeName: 'b', AttributeType: 'B' } ],
    KeySchema: [ { KeyType: 'HASH', AttributeName: 'a' }, { KeyType: 'RANGE', AttributeName: 'b' } ],
    ProvisionedThroughput: { ReadCapacityUnits: readCapacity, WriteCapacityUnits: writeCapacity },
  } ]

  async.forEach(tables, createAndWait, function (err) {
    if (err) return callback(err)
    globalTablesCreated = true

    // Set the global awsAccountId from the created table
    getGlobalAccountId(callback)
  })
}

// Start global server for legacy tests
function startGlobalServer (callback) {
  if (globalServerStarted) return callback()
  if (useRemoteDynamo) {
    globalServerStarted = true
    return createGlobalTestTables(callback)
  }

  globalServer = dynalite({ path: process.env.DYNALITE_PATH })
  globalServer.listen(port, function (err) {
    if (err) return callback(err)
    globalServerStarted = true
    createGlobalTestTables(callback)
  })
}

// Ensure global server is started before any test
if (typeof before !== 'undefined') {
  before(function (done) {
    startGlobalServer(done)
  })
}

if (typeof after !== 'undefined') {
  after(function (done) {
    if (globalServer) {
      globalServer.close(done)
    }
    else {
      done()
    }
  })
}

function randomString () {
  return ('AAAAAAAAA' + randomNumber()).slice(-10)
}

function randomNumber () {
  return String(Math.random() * 0x100000000)
}

function randomName () {
  return prefix + randomString()
}

// Legacy functions removed - they are now encapsulated within TestHelper instances

function createAndWait (table, done) {
  request(opts('CreateTable', table), function (err, res) {
    if (err) return done(err)
    if (res.statusCode != 200) return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
    setTimeout(waitUntilActive, 1000, table.TableName, done)
  })
}

// deleteAndWait function removed - now encapsulated within TestHelper instances

function waitUntilActive (name, done) {
  request(opts('DescribeTable', { TableName: name }), function (err, res) {
    if (err) return done(err)
    if (res.statusCode != 200) return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
    if (res.body.Table.TableStatus == 'ACTIVE' &&
        (!res.body.Table.GlobalSecondaryIndexes ||
          res.body.Table.GlobalSecondaryIndexes.every(function (index) { return index.IndexStatus == 'ACTIVE' }))) {
      return done(null, res)
    }
    setTimeout(waitUntilActive, 1000, name, done)
  })
}

function waitUntilDeleted (name, done) {
  request(opts('DescribeTable', { TableName: name }), function (err, res) {
    if (err) return done(err)
    if (res.body && res.body.__type == 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException')
      return done(null, res)
    else if (res.statusCode != 200)
      return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
    setTimeout(waitUntilDeleted, 1000, name, done)
  })
}

function waitUntilIndexesActive (name, done) {
  request(opts('DescribeTable', { TableName: name }), function (err, res) {
    if (err) return done(err)
    if (res.statusCode != 200)
      return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
    else if (res.body.Table.GlobalSecondaryIndexes.every(function (index) { return index.IndexStatus == 'ACTIVE' }))
      return done(null, res)
    setTimeout(waitUntilIndexesActive, 1000, name, done)
  })
}

function deleteWhenActive (name, done) {
  if (!done) done = function () { }
  waitUntilActive(name, function (err) {
    if (err) return done(err)
    request(opts('DeleteTable', { TableName: name }), done)
  })
}

function clearTable (name, keyNames, segments, done) {
  if (!done) { done = segments; segments = 2 }
  if (!Array.isArray(keyNames)) keyNames = [ keyNames ]

  scanAndDelete(done)

  function scanAndDelete (cb) {
    async.times(segments, scanSegmentAndDelete, function (err, segmentsHadKeys) {
      if (err) return cb(err)
      if (segmentsHadKeys.some(Boolean)) return scanAndDelete(cb)
      cb()
    })
  }

  function scanSegmentAndDelete (n, cb) {
    request(opts('Scan', { TableName: name, AttributesToGet: keyNames, Segment: n, TotalSegments: segments }), function (err, res) {
      if (err) return cb(err)
      if (/ProvisionedThroughputExceededException/.test(res.body.__type)) {
        console.log('ProvisionedThroughputExceededException')
        return setTimeout(scanSegmentAndDelete, 2000, n, cb)
      }
      else if (res.statusCode != 200) {
        return cb(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      }
      if (!res.body.ScannedCount) return cb(null, false)

      var keys = res.body.Items, batchDeletes

      for (batchDeletes = []; keys.length; keys = keys.slice(25))
        batchDeletes.push(batchWriteUntilDone.bind(null, name, { deletes: keys.slice(0, 25) }))

      async.parallel(batchDeletes, function (err) {
        if (err) return cb(err)
        cb(null, true)
      })
    })
  }
}

function replaceTable (name, keyNames, items, segments, done) {
  if (!done) { done = segments; segments = 2 }

  clearTable(name, keyNames, segments, function (err) {
    if (err) return done(err)
    batchBulkPut(name, items, segments, done)
  })
}

function batchBulkPut (name, items, segments, done) {
  if (!done) { done = segments; segments = 2 }

  var itemChunks = [], i
  for (i = 0; i < items.length; i += 25)
    itemChunks.push(items.slice(i, i + 25))

  async.eachLimit(itemChunks, segments, function (items, cb) { batchWriteUntilDone(name, { puts: items }, cb) }, done)
}

function batchWriteUntilDone (name, actions, cb) {
  var batchReq = { RequestItems: {} }, batchRes = {}
  batchReq.RequestItems[name] = (actions.puts || []).map(function (item) { return { PutRequest: { Item: item } } })
    .concat((actions.deletes || []).map(function (key) { return { DeleteRequest: { Key: key } } }))

  async.doWhilst(
    function (cb) {
      request(opts('BatchWriteItem', batchReq), function (err, res) {
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

var assertType = legacyAssertions.assertType
var assertAccessDenied = legacyAssertions.assertAccessDenied
var assertValidation = legacyAssertions.assertValidation
var assertNotFound = legacyAssertions.assertNotFound
var assertInUse = legacyAssertions.assertInUse
var assertConditional = legacyAssertions.assertConditional

function strDecrement (str, regex, length) {
  regex = regex || /.?/
  length = length || 255
  var lastIx = str.length - 1, lastChar = str.charCodeAt(lastIx) - 1, prefix = str.slice(0, lastIx), finalChar = 255
  while (lastChar >= 0 && !regex.test(String.fromCharCode(lastChar))) lastChar--
  if (lastChar < 0) return prefix
  prefix += String.fromCharCode(lastChar)
  while (finalChar >= 0 && !regex.test(String.fromCharCode(finalChar))) finalChar--
  if (lastChar < 0) return prefix
  while (prefix.length < length) prefix += String.fromCharCode(finalChar)
  return prefix
}

// Legacy exports - maintain backward compatibility
exports.MAX_SIZE = MAX_SIZE
exports.awsRegion = awsRegion
exports.awsAccountId = awsAccountId
exports.version = version
exports.prefix = prefix
exports.request = request
exports.opts = opts
exports.waitUntilActive = waitUntilActive
exports.waitUntilDeleted = waitUntilDeleted
exports.waitUntilIndexesActive = waitUntilIndexesActive
exports.deleteWhenActive = deleteWhenActive
exports.createAndWait = createAndWait
exports.clearTable = clearTable
exports.replaceTable = replaceTable
exports.batchWriteUntilDone = batchWriteUntilDone
exports.batchBulkPut = batchBulkPut
exports.assertSerialization = assertSerialization
exports.assertType = assertType
exports.assertValidation = assertValidation
exports.assertNotFound = assertNotFound
exports.assertInUse = assertInUse
exports.assertConditional = assertConditional
exports.assertAccessDenied = assertAccessDenied
exports.strDecrement = strDecrement
exports.randomString = randomString
exports.randomNumber = randomNumber
exports.randomName = randomName
exports.readCapacity = readCapacity
exports.writeCapacity = writeCapacity
exports.testHashTable = testHashTable
exports.testHashNTable = testHashNTable
exports.testRangeTable = testRangeTable
exports.testRangeNTable = testRangeNTable
exports.testRangeBTable = testRangeBTable
exports.runSlowTests = runSlowTests

// Global hooks are removed - no more automatic before/after execution
