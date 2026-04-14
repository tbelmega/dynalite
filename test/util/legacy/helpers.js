var http = require('http'),
  async = require('async'),
  dynalite = require('../../..'),
  requestUtils = require('./request')

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

function assertType (target, property, type, done) {
  var msgs = [], pieces = property.split('.'), subtypeMatch = type.match(/(.+?)<(.+)>$/), subtype
  if (subtypeMatch != null) {
    type = subtypeMatch[1]
    subtype = subtypeMatch[2]
  }
  var castMsg = "class sun.reflect.generics.reflectiveObjects.ParameterizedTypeImpl cannot be cast to class java.lang.Class (sun.reflect.generics.reflectiveObjects.ParameterizedTypeImpl and java.lang.Class are in module java.base of loader 'bootstrap')"
  switch (type) {
  case 'Boolean':
    msgs = [
      [ '23', 'Unexpected token received from parser' ],
      [ 23, 'NUMBER_VALUE cannot be converted to Boolean' ],
      [ -2147483648, 'NUMBER_VALUE cannot be converted to Boolean' ],
      [ 2147483648, 'NUMBER_VALUE cannot be converted to Boolean' ],
      [ 34.56, 'DECIMAL_VALUE cannot be converted to Boolean' ],
      [ [], 'Unrecognized collection type class java.lang.Boolean' ],
      [ {}, 'Start of structure or map found where not expected' ],
    ]
    break
  case 'String':
    msgs = [
      [ true, 'TRUE_VALUE cannot be converted to String' ],
      [ false, 'FALSE_VALUE cannot be converted to String' ],
      [ 23, 'NUMBER_VALUE cannot be converted to String' ],
      [ -2147483648, 'NUMBER_VALUE cannot be converted to String' ],
      [ 2147483648, 'NUMBER_VALUE cannot be converted to String' ],
      [ 34.56, 'DECIMAL_VALUE cannot be converted to String' ],
      [ [], 'Unrecognized collection type class java.lang.String' ],
      [ {}, 'Start of structure or map found where not expected' ],
    ]
    break
  case 'Integer':
    msgs = [
      [ '23', 'STRING_VALUE cannot be converted to Integer' ],
      [ true, 'TRUE_VALUE cannot be converted to Integer' ],
      [ false, 'FALSE_VALUE cannot be converted to Integer' ],
      [ [], 'Unrecognized collection type class java.lang.Integer' ],
      [ {}, 'Start of structure or map found where not expected' ],
    ]
    break
  case 'Long':
    msgs = [
      [ '23', 'STRING_VALUE cannot be converted to Long' ],
      [ true, 'TRUE_VALUE cannot be converted to Long' ],
      [ false, 'FALSE_VALUE cannot be converted to Long' ],
      [ [], 'Unrecognized collection type class java.lang.Long' ],
      [ {}, 'Start of structure or map found where not expected' ],
    ]
    break
  case 'Blob':
    msgs = [
      [ true, 'only base-64-encoded strings are convertible to bytes' ],
      [ 23, 'only base-64-encoded strings are convertible to bytes' ],
      [ -2147483648, 'only base-64-encoded strings are convertible to bytes' ],
      [ 2147483648, 'only base-64-encoded strings are convertible to bytes' ],
      [ 34.56, 'only base-64-encoded strings are convertible to bytes' ],
      [ [], 'Unrecognized collection type class java.nio.ByteBuffer' ],
      [ {}, 'Start of structure or map found where not expected' ],
      [ '23456', 'Base64 encoded length is expected a multiple of 4 bytes but found: 5' ],
      [ '=+/=', 'Invalid last non-pad Base64 character dectected' ],
      [ '+/+=', 'Invalid last non-pad Base64 character dectected' ],
    ]
    break
  case 'List':
    msgs = [
      [ '23', 'Unexpected field type' ],
      [ true, 'Unexpected field type' ],
      [ 23, 'Unexpected field type' ],
      [ -2147483648, 'Unexpected field type' ],
      [ 2147483648, 'Unexpected field type' ],
      [ 34.56, 'Unexpected field type' ],
      [ {}, 'Start of structure or map found where not expected' ],
    ]
    break
  case 'ParameterizedList':
    msgs = [
      [ '23', castMsg ],
      [ true, castMsg ],
      [ 23, castMsg ],
      [ -2147483648, castMsg ],
      [ 2147483648, castMsg ],
      [ 34.56, castMsg ],
      [ {}, 'Start of structure or map found where not expected' ],
    ]
    break
  case 'Map':
    msgs = [
      [ '23', 'Unexpected field type' ],
      [ true, 'Unexpected field type' ],
      [ 23, 'Unexpected field type' ],
      [ -2147483648, 'Unexpected field type' ],
      [ 2147483648, 'Unexpected field type' ],
      [ 34.56, 'Unexpected field type' ],
      [ [], 'Unrecognized collection type java.util.Map<java.lang.String, ' + (~subtype.indexOf('.') ? subtype : 'com.amazonaws.dynamodb.v20120810.' + subtype) + '>' ],
    ]
    break
  case 'ParameterizedMap':
    msgs = [
      [ '23', castMsg ],
      [ true, castMsg ],
      [ 23, castMsg ],
      [ -2147483648, castMsg ],
      [ 2147483648, castMsg ],
      [ 34.56, castMsg ],
      [ [], 'Unrecognized collection type java.util.Map<java.lang.String, com.amazonaws.dynamodb.v20120810.AttributeValue>' ],
    ]
    break
  case 'ValueStruct':
    msgs = [
      [ '23', 'Unexpected value type in payload' ],
      [ true, 'Unexpected value type in payload' ],
      [ 23, 'Unexpected value type in payload' ],
      [ -2147483648, 'Unexpected value type in payload' ],
      [ 2147483648, 'Unexpected value type in payload' ],
      [ 34.56, 'Unexpected value type in payload' ],
      [ [], 'Unrecognized collection type class com.amazonaws.dynamodb.v20120810.' + subtype ],
    ]
    break
  case 'FieldStruct':
    msgs = [
      [ '23', 'Unexpected field type' ],
      [ true, 'Unexpected field type' ],
      [ 23, 'Unexpected field type' ],
      [ -2147483648, 'Unexpected field type' ],
      [ 2147483648, 'Unexpected field type' ],
      [ 34.56, 'Unexpected field type' ],
      [ [], 'Unrecognized collection type class com.amazonaws.dynamodb.v20120810.' + subtype ],
    ]
    break
  case 'AttrStruct':
    async.forEach([
      [ property, subtype + '<AttributeValue>' ],
      [ property + '.S', 'String' ],
      [ property + '.N', 'String' ],
      [ property + '.B', 'Blob' ],
      [ property + '.BOOL', 'Boolean' ],
      [ property + '.NULL', 'Boolean' ],
      [ property + '.SS', 'List' ],
      [ property + '.SS.0', 'String' ],
      [ property + '.NS', 'List' ],
      [ property + '.NS.0', 'String' ],
      [ property + '.BS', 'List' ],
      [ property + '.BS.0', 'Blob' ],
      [ property + '.L', 'List' ],
      [ property + '.L.0', 'ValueStruct<AttributeValue>' ],
      [ property + '.L.0.BS', 'List' ],
      [ property + '.L.0.BS.0', 'Blob' ],
      [ property + '.M', 'Map<AttributeValue>' ],
      [ property + '.M.a', 'ValueStruct<AttributeValue>' ],
      [ property + '.M.a.BS', 'List' ],
      [ property + '.M.a.BS.0', 'Blob' ],
    ], function (test, cb) { assertType(target, test[0], test[1], cb) }, done)
    return
  default:
    throw new Error('Unknown type: ' + type)
  }
  async.forEach(msgs, function (msg, cb) {
    var data = {}, child = data, i, ix
    for (i = 0; i < pieces.length - 1; i++) {
      ix = Array.isArray(child) ? 0 : pieces[i]
      child = child[ix] = pieces[i + 1] === '0' ? [] : {}
    }
    ix = Array.isArray(child) ? 0 : pieces[pieces.length - 1]
    child[ix] = msg[0]
    assertSerialization(target, data, msg[1], cb)
  }, done)
}

function assertAccessDenied (target, data, msg, done) {
  request(opts(target, data), function (err, res) {
    if (err) return done(err)
    should(res.statusCode).equal(400)
    if (typeof res.body !== 'object') {
      return done(new Error('Not JSON: ' + res.body))
    }
    should(res.body.__type).equal('com.amazon.coral.service#AccessDeniedException')
    if (msg instanceof RegExp) {
      should(res.body.Message).match(msg)
    }
    else {
      should(res.body.Message).equal(msg)
    }
    done()
  })
}

function assertValidation (target, data, msg, done) {
  request(opts(target, data), function (err, res) {
    if (err) return done(err)
    if (typeof res.body !== 'object') {
      return done(new Error('Not JSON: ' + res.body))
    }
    should(res.body.__type).equal('com.amazon.coral.validate#ValidationException')
    if (msg instanceof RegExp) {
      should(res.body.message).match(msg)
    }
    else if (Array.isArray(msg)) {
      var prefix = msg.length + ' validation error' + (msg.length === 1 ? '' : 's') + ' detected: '
      should(res.body.message).startWith(prefix)
      var errors = res.body.message.slice(prefix.length).split('; ')
      for (var i = 0; i < msg.length; i++) {
        should(errors).matchAny(msg[i])
      }
    }
    else {
      should(res.body.message).equal(msg)
    }
    should(res.statusCode).equal(400)
    done()
  })
}

function assertNotFound (target, data, msg, done) {
  request(opts(target, data), function (err, res) {
    if (err) return done(err)
    should(res.statusCode).equal(400)
    should(res.body).eql({
      __type: 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException',
      message: msg,
    })
    done()
  })
}

function assertInUse (target, data, msg, done) {
  request(opts(target, data), function (err, res) {
    if (err) return done(err)
    should(res.statusCode).equal(400)
    should(res.body).eql({
      __type: 'com.amazonaws.dynamodb.v20120810#ResourceInUseException',
      message: msg,
    })
    done()
  })
}

function assertConditional (target, data, done) {
  request(opts(target, data), function (err, res) {
    if (err) return done(err)
    should(res.statusCode).equal(400)
    should(res.body).eql({
      __type: 'com.amazonaws.dynamodb.v20120810#ConditionalCheckFailedException',
      message: 'The conditional request failed',
    })
    done()
  })
}

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
