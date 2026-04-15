var http = require('http')
var async = require('async')
import type {
  HelperCallback,
  HelperHttpResponse,
  HelperRequestDefaults,
  HelperTableDefinition,
  LegacyAssertionsApi,
  LegacyAssertionsDependencies,
  LegacyHelperExports,
  LegacyNaming,
  LegacyNamingOptions,
  LegacyRequestApi,
  LegacyRequestApiDeps,
  LegacyTableDataApi,
  LegacyTableDataDependencies,
  LegacyTableLifecycleApi,
  LegacyTableLifecycleDependencies,
} from '../../../types/types';

var dynalite: (options: { path?: string }) => import('http').Server = require('../../../..')
var requestUtils: {
  createLegacyRequestApi: (deps: LegacyRequestApiDeps) => LegacyRequestApi;
} = require('./request')
var assertions: {
  createLegacyAssertions: (dependencies: LegacyAssertionsDependencies) => LegacyAssertionsApi;
} = require('./assertions')
var naming: {
  createLegacyNaming: (options?: LegacyNamingOptions) => LegacyNaming;
} = require('./naming')
var tableLifecycle: {
  createLegacyTableLifecycle: (dependencies: LegacyTableLifecycleDependencies) => LegacyTableLifecycleApi;
} = require('./table-lifecycle')
var tableData: {
  createLegacyTableData: (dependencies: LegacyTableDataDependencies) => LegacyTableDataApi;
} = require('./table-data')

var useRemoteDynamo = process.env.REMOTE
var runSlowTests = true
if (useRemoteDynamo && !process.env.SLOW_TESTS) runSlowTests = false

http.globalAgent.maxSockets = Infinity

var MAX_SIZE = 409600
var awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
var awsAccountId = process.env.AWS_ACCOUNT_ID
var version = 'DynamoDB_20120810'
var prefix = '__dynalite_test_'
var legacyNaming = naming.createLegacyNaming({ prefix: prefix })
var randomString = legacyNaming.randomString
var randomNumber = legacyNaming.randomNumber
var randomName = legacyNaming.randomName
var strDecrement = legacyNaming.strDecrement
var readCapacity = 10
var writeCapacity = 5
var testHashTable = useRemoteDynamo ? '__dynalite_test_1' : randomName()
var testHashNTable = useRemoteDynamo ? '__dynalite_test_2' : randomName()
var testRangeTable = useRemoteDynamo ? '__dynalite_test_3' : randomName()
var testRangeNTable = useRemoteDynamo ? '__dynalite_test_4' : randomName()
var testRangeBTable = useRemoteDynamo ? '__dynalite_test_5' : randomName()

var port = 10000 + Math.round(Math.random() * 10000)
var requestOpts: HelperRequestDefaults = useRemoteDynamo ?
  { host: 'dynamodb.' + awsRegion + '.amazonaws.com', method: 'POST' } :
  { host: '127.0.0.1', port: port, method: 'POST' }

var CREATE_REMOTE_TABLES = true
var MAX_RETRIES = 20

var globalServer: import('http').Server | null = null
var globalServerStarted = false
var globalTablesCreated = false

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
var legacyTableLifecycle = tableLifecycle.createLegacyTableLifecycle({
  request: request,
  opts: opts,
})
var legacyTableData = tableData.createLegacyTableData({
  request: request,
  opts: opts,
})
var createAndWait = legacyTableLifecycle.createAndWait
var waitUntilActive = legacyTableLifecycle.waitUntilActive
var waitUntilDeleted = legacyTableLifecycle.waitUntilDeleted
var waitUntilIndexesActive = legacyTableLifecycle.waitUntilIndexesActive
var deleteWhenActive = legacyTableLifecycle.deleteWhenActive
var clearTable = legacyTableData.clearTable
var replaceTable = legacyTableData.replaceTable
var batchBulkPut = legacyTableData.batchBulkPut
var batchWriteUntilDone = legacyTableData.batchWriteUntilDone

var assertType = legacyAssertions.assertType
var assertAccessDenied = legacyAssertions.assertAccessDenied
var assertValidation = legacyAssertions.assertValidation
var assertNotFound = legacyAssertions.assertNotFound
var assertInUse = legacyAssertions.assertInUse
var assertConditional = legacyAssertions.assertConditional

var legacyHelperExports: LegacyHelperExports = {
  MAX_SIZE: MAX_SIZE,
  awsRegion: awsRegion,
  awsAccountId: awsAccountId,
  version: version,
  prefix: prefix,
  request: request,
  opts: opts,
  waitUntilActive: waitUntilActive,
  waitUntilDeleted: waitUntilDeleted,
  waitUntilIndexesActive: waitUntilIndexesActive,
  deleteWhenActive: deleteWhenActive,
  createAndWait: createAndWait,
  clearTable: clearTable,
  replaceTable: replaceTable,
  batchWriteUntilDone: batchWriteUntilDone,
  batchBulkPut: batchBulkPut,
  assertSerialization: assertSerialization,
  assertType: assertType,
  assertValidation: assertValidation,
  assertNotFound: assertNotFound,
  assertInUse: assertInUse,
  assertConditional: assertConditional,
  assertAccessDenied: assertAccessDenied,
  strDecrement: strDecrement,
  randomString: randomString,
  randomNumber: randomNumber,
  randomName: randomName,
  readCapacity: readCapacity,
  writeCapacity: writeCapacity,
  testHashTable: testHashTable,
  testHashNTable: testHashNTable,
  testRangeTable: testRangeTable,
  testRangeNTable: testRangeNTable,
  testRangeBTable: testRangeBTable,
  runSlowTests: runSlowTests,
}

function getGlobalAccountId (callback: HelperCallback): void {
  request(opts('DescribeTable', { TableName: testHashTable }), function (err: unknown, res?: HelperHttpResponse): void {
    if (err) return callback(err)
    if (res == null || res.statusCode == null) return callback(new Error('Missing response statusCode'))
    if (res.statusCode !== 200) return callback(new Error('Failed to get account ID: ' + res.statusCode))
    var accountId = getAccountIdFromDescribeTable(res)
    if (accountId != null) {
      awsAccountId = accountId
      legacyHelperExports.awsAccountId = awsAccountId
    }
    callback()
  })
}

function createGlobalTestTables (callback: HelperCallback): void {
  if (globalTablesCreated) return callback()
  if (useRemoteDynamo && !CREATE_REMOTE_TABLES) {
    globalTablesCreated = true
    return callback()
  }

  var tables: HelperTableDefinition[] = [ {
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

  async.forEach(tables, createAndWait, function (err: unknown): void {
    if (err) return callback(err)
    globalTablesCreated = true
    getGlobalAccountId(callback)
  })
}

function startGlobalServer (callback: HelperCallback): void {
  if (globalServerStarted) return callback()
  if (useRemoteDynamo) {
    globalServerStarted = true
    return createGlobalTestTables(callback)
  }

  globalServer = dynalite({ path: process.env.DYNALITE_PATH })
  globalServer.listen(port, function (): void {
    globalServerStarted = true
    createGlobalTestTables(callback)
  })
}

if (typeof before !== 'undefined') {
  before(function (done: HelperCallback): void {
    startGlobalServer(done)
  })
}

if (typeof after !== 'undefined') {
  after(function (done: HelperCallback): void {
    if (globalServer) {
      globalServer.close(function (): void {
        done()
      })
    }
    else {
      done()
    }
  })
}

module.exports = legacyHelperExports

function getAccountIdFromDescribeTable (res: HelperHttpResponse): string | undefined {
  if (typeof res.body === 'string') return
  var table = res.body.Table
  if (table == null || typeof table !== 'object' || !('TableArn' in table) || typeof table.TableArn !== 'string') return
  var tableArn = table.TableArn
  if (typeof tableArn !== 'string') return
  return tableArn.split(':')[4]
}
