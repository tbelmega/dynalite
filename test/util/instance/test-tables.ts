var async = require('async')
import type {
  HelperCallback,
  HelperHttpResponse,
  HelperTableDefinition,
  InstanceTestHelper,
  InstanceTestTablesOptions,
} from '../../../types/types';

function attachInstanceTestTables (
  helper: InstanceTestHelper,
  options: InstanceTestTablesOptions = {},
): void {
  var createRemoteTables = options.createRemoteTables

  helper.getAccountId = function (done: HelperCallback): void {
    helper.request(helper.opts('DescribeTable', { TableName: helper.testHashTable }), function (err: unknown, res?: HelperHttpResponse): void {
      if (err) return done(err)
      var tableArn = getTableArn(res)
      if (tableArn == null) {
        return done(new Error('Missing table ARN'))
      }
      helper.awsAccountId = tableArn.split(':')[4]
      done()
    })
  }

  helper.createTestTables = function (done: HelperCallback): void {
    if (helper.useRemoteDynamo && !createRemoteTables) return done()

    helper.deleteTestTables(function (err: unknown): void {
      if (err) return done(err)

      var readCapacity = helper.readCapacity, writeCapacity = helper.writeCapacity
      var tables: HelperTableDefinition[] = [ {
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
}

function getTableArn (res?: HelperHttpResponse): string | undefined {
  if (res == null || typeof res.body === 'string') return
  var table = res.body.Table
  if (typeof table !== 'object' || table == null || !('TableArn' in table) || typeof table.TableArn !== 'string') return
  return table.TableArn
}

module.exports = {
  attachInstanceTestTables: attachInstanceTestTables,
}
