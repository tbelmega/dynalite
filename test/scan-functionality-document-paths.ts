var helpers = require('../../test/helpers'),
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


  describe('document paths and projections', function () {

    it('should scan by nested properties', function (done) {
      var nestedValue = { S: helpers.randomString() }
      var item: DynamoItem = {
        a: { S: helpers.randomString() },
        b: { M: { a: { M: { b: nestedValue } } } },
        c: { N: helpers.randomNumber() },
      }
      var item2 = { a: { S: helpers.randomString() }, b: { L: [ { S: helpers.randomString() }, item.b ] }, c: item.c }
      var item3 = { a: { S: helpers.randomString() }, b: item.b, c: { N: helpers.randomNumber() } }
      var item4 = { a: { S: helpers.randomString() }, b: { S: helpers.randomString() }, c: item.c }
      var item5 = { a: { S: helpers.randomString() }, c: item.c }
      var batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
        { PutRequest: { Item: item4 } },
        { PutRequest: { Item: item5 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          FilterExpression: '(b[1].a.b = :b OR b.a.b = :b) AND c = :c',
          ExpressionAttributeValues: { ':b': nestedValue, ':c': item.c },
        }, {
          FilterExpression: '(attribute_exists(b.a) OR attribute_exists(b[1])) AND c = :c',
          ExpressionAttributeValues: { ':c': item.c },
        }, {
          FilterExpression: '(attribute_type(b.a, :m) OR attribute_type(b[1].a, :m)) AND c = :c',
          ExpressionAttributeValues: { ':c': item.c, ':m': { S: 'M' } },
        } ], function (scanOpts: ScanRequest, cb: AsyncCallback) {
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

    it('should calculate size function correctly', function (done) {
      var item: DynamoItem = { a: { S: helpers.randomString() }, b: { S: 'abÿ' }, c: { N: helpers.randomNumber() } }
      var item2 = { a: { S: helpers.randomString() }, b: { N: '123' }, c: item.c }
      var item3 = { a: { S: helpers.randomString() }, b: { B: 'YWJj' }, c: item.c }
      var item4 = { a: { S: helpers.randomString() }, b: { SS: [ 'a', 'b', 'c' ] }, c: item.c }
      var item5 = { a: { S: helpers.randomString() }, b: { L: [ { S: 'a' }, { S: 'a' }, { S: 'a' } ] }, c: item.c }
      var item6 = { a: { S: helpers.randomString() }, b: { M: { a: { S: 'a' }, b: { S: 'a' }, c: { S: 'a' } } }, c: item.c }
      var item7 = { a: { S: helpers.randomString() }, b: { S: 'abcd' }, c: item.c }
      var batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
        { PutRequest: { Item: item4 } },
        { PutRequest: { Item: item5 } },
        { PutRequest: { Item: item6 } },
        { PutRequest: { Item: item7 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          FilterExpression: 'size(b) = :b AND c = :c',
          ExpressionAttributeValues: { ':b': { N: '3' }, ':c': item.c },
        }, {
          FilterExpression: '(size(b)) = :b AND c = :c',
          ExpressionAttributeValues: { ':b': { N: '3' }, ':c': item.c },
        }, {
          FilterExpression: '((size(b)) = :b) AND c = :c',
          ExpressionAttributeValues: { ':b': { N: '3' }, ':c': item.c },
        } ], function (scanOpts: ScanRequest, cb: AsyncCallback) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item4)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).containEql(item6)
            should(res.body.Items).have.length(5)
            should(res.body.Count).equal(5)
            cb()
          })
        }, done)
      })
    })

    it('should only return requested attributes', function (done) {
      var item: DynamoItem = { a: { S: helpers.randomString() }, b: { S: 'b1' }, c: { S: helpers.randomString() }, d: { S: 'd1' } },
        item2 = { a: { S: helpers.randomString() }, b: { S: 'b2' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { S: 'b3' }, c: item.c, d: { S: 'd3' }, e: { S: 'e3' } },
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
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
          AttributesToGet: [ 'b', 'd' ],
        }, {
          FilterExpression: 'c = :c',
          ExpressionAttributeValues: { ':c': item.c },
          ProjectionExpression: 'b, d',
        }, {
          FilterExpression: 'c = :c',
          ExpressionAttributeValues: { ':c': item.c },
          ExpressionAttributeNames: { '#b': 'b', '#d': 'd' },
          ProjectionExpression: '#b, #d',
        } ], function (scanOpts: ScanRequest, cb: AsyncCallback) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql({ b: { S: 'b1' }, d: { S: 'd1' } })
            should(res.body.Items).containEql({ b: { S: 'b2' } })
            should(res.body.Items).containEql({ b: { S: 'b3' }, d: { S: 'd3' } })
            should(res.body.Items).have.length(3)
            should(res.body.Count).equal(3)
            cb()
          })
        }, done)
      })
    })

    it('should return COUNT if requested', function (done) {
      var item: DynamoItem = { a: { S: helpers.randomString() }, b: { S: '1' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { N: '1' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { S: '1' }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { S: '2' }, c: item.c },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
        { PutRequest: { Item: item4 } },
        { PutRequest: { Item: item5 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        request(opts({
          TableName: helpers.testHashTable, ScanFilter: {
            b: { ComparisonOperator: 'EQ', AttributeValueList: [ item.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          }, Select: 'COUNT',
        }), function (err, res) {
          if (err) return done(err)
          should(res.statusCode).equal(200)
          should.not.exist(res.body.Items)
          should(res.body.Count).equal(2)
          should(res.body.ScannedCount).be.above(1)
          done()
        })
      })
    })

  })

})
