var helpers = require('./helpers'),
  should = require('should'),
  async = require('async')

import type {
  AsyncCallback,
  BatchWriteRequest,
  DynamoItem,
  ScanRequest,
  ScanResponse,
  TestDynamoRequest,
} from '../types/types'

var target = 'Scan',
  request: <TResponse extends ScanResponse>(requestOptions: TestDynamoRequest, cb: (err: unknown, res: TResponse) => void) => void = helpers.request,
  opts: (data: ScanRequest) => Record<string, unknown> = helpers.opts.bind(null, target)

function forEach<T> (items: T[], iterator: (item: T, cb: AsyncCallback) => void, done: AsyncCallback) {
  async.forEach(items, iterator, done)
}

describe('scan - functionality', function () {


  describe('equality and inequality operators', function () {

    it('should scan by EQ on type B', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { B: 'abcd' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { B: 'abcd' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: 'Yg==' }, c: item.c },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'EQ', AttributeValueList: [ item.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b = :b AND c = :c',
          ExpressionAttributeValues: { ':b': item.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).have.length(2)
            should(res.body.Count).equal(2)
            cb()
          })
        }, done)
      })
    })

    it('should scan by EQ on type SS', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { SS: [ 'a', 'b' ] }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { SS: [ 'a', 'b' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { SS: [ 'a', 'b', 'c' ] }, c: item.c },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'EQ', AttributeValueList: [ { SS: [ 'b', 'a' ] } ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b = :b AND c = :c',
          ExpressionAttributeValues: { ':b': { SS: [ 'b', 'a' ] }, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).have.length(2)
            should(res.body.Count).equal(2)
            cb()
          })
        }, done)
      })
    })

    it('should scan by EQ on type NS', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { NS: [ '1', '2' ] }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { NS: [ '1', '2' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { NS: [ '1', '2', '3' ] }, c: item.c },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'EQ', AttributeValueList: [ { NS: [ '2', '1' ] } ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b = :b AND c = :c',
          ExpressionAttributeValues: { ':b': { NS: [ '2', '1' ] }, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            if (!res.body.Items) return cb(new Error('Expected scan items for NS equality test'))
            var normalizedItems = res.body.Items.map(function (resultItem: DynamoItem) {
              should(resultItem.b.NS).have.length(2)
              should(resultItem.b.NS).containEql('1')
              should(resultItem.b.NS).containEql('2')
              return { a: resultItem.a, c: resultItem.c }
            })
            should(normalizedItems).containEql({ a: item.a, c: item.c })
            should(normalizedItems).containEql({ a: item2.a, c: item2.c })
            should(normalizedItems).have.length(2)
            should(res.body.Count).equal(2)
            cb()
          })
        }, done)
      })
    })

    it('should scan by EQ on type BS', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { BS: [ 'Yg==', 'abcd' ] }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { BS: [ 'Yg==', 'abcd' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { BS: [ 'Yg==', 'abcd', '1234' ] }, c: item.c },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'EQ', AttributeValueList: [ { BS: [ 'abcd', 'Yg==' ] } ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b = :b AND c = :c',
          ExpressionAttributeValues: { ':b': { BS: [ 'abcd', 'Yg==' ] }, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).have.length(2)
            should(res.body.Count).equal(2)
            cb()
          })
        }, done)
      })
    })

    it('should scan by EQ on different types', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: '1234' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { N: '1234' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: '1234' }, c: item.c },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'EQ', AttributeValueList: [ item.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b = :b AND c = :c',
          ExpressionAttributeValues: { ':b': item.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).eql([ item ])
            should(res.body.Count).equal(1)
            cb()
          })
        }, done)
      })
    })

    it('should scan by NE on different types', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: '1234' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { N: '1234' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: '1234' }, c: item.c },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'NE', AttributeValueList: [ item.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b <> :b AND c = :c',
          ExpressionAttributeValues: { ':b': item.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).have.length(2)
            should(res.body.Count).equal(2)
            cb()
          })
        }, done)
      })
    })

    it('should scan by NE on type SS', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { SS: [ 'a', 'b' ] }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { SS: [ 'a', 'b' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { SS: [ 'a', 'b', 'c' ] }, c: item.c },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'NE', AttributeValueList: [ { SS: [ 'b', 'a' ] } ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b <> :b AND c = :c',
          ExpressionAttributeValues: { ':b': { SS: [ 'b', 'a' ] }, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).have.length(1)
            should(res.body.Count).equal(1)
            cb()
          })
        }, done)
      })
    })

    it('should scan by NE on type NS', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { NS: [ '1', '2' ] }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { NS: [ '1', '2' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { NS: [ '3', '2', '1' ] }, c: item.c },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'NE', AttributeValueList: [ { NS: [ '2', '1' ] } ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b <> :b AND c = :c',
          ExpressionAttributeValues: { ':b': { NS: [ '2', '1' ] }, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).have.length(1)
            should(res.body.Count).equal(1)
            cb()
          })
        }, done)
      })
    })

    it('should scan by NE on type BS', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { BS: [ 'Yg==', 'abcd' ] }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { BS: [ 'Yg==', 'abcd' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { BS: [ 'Yg==', 'abcd', '1234' ] }, c: item.c },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'NE', AttributeValueList: [ { BS: [ 'abcd', 'Yg==' ] } ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b <> :b AND c = :c',
          ExpressionAttributeValues: { ':b': { BS: [ 'abcd', 'Yg==' ] }, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).have.length(1)
            should(res.body.Count).equal(1)
            cb()
          })
        }, done)
      })
    })

  })

})
