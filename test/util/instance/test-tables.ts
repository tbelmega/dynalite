// @ts-nocheck
var async = require('async')

function attachInstanceTestTables (helper, options) {
  options = options || {}
  var createRemoteTables = options.createRemoteTables

  helper.getAccountId = function (done) {
    helper.request(helper.opts('DescribeTable', { TableName: helper.testHashTable }), function (err, res) {
      if (err) return done(err)
      helper.awsAccountId = res.body.Table.TableArn.split(':')[4]
      done()
    })
  }

  helper.createTestTables = function (done) {
    if (helper.useRemoteDynamo && !createRemoteTables) return done()

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
}

module.exports = {
  attachInstanceTestTables: attachInstanceTestTables,
}
