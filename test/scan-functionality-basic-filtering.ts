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


  describe('basic filtering', function () {

    it('should scan with no filter', function (done) {
      var item = { a: { S: helpers.randomString() } }
      request(helpers.opts('PutItem', { TableName: helpers.testHashTable, Item: item }), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        request(opts({ TableName: helpers.testHashTable }), function (err, res) {
          if (err) return done(err)
          should(res.statusCode).equal(200)
          should(res.body.Items).containEql(item)
          should(res.body.Count).be.above(0)
          should(res.body.ScannedCount).be.above(0)
          done()
        })
      })
    })

    it('should scan by id (type S)', function (done) {
      var item: DynamoItem = { a: { S: helpers.randomString() } }
      request(helpers.opts('PutItem', { TableName: helpers.testHashTable, Item: item }), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([
          { ScanFilter: { a: { ComparisonOperator: 'EQ', AttributeValueList: [ item.a ] } } },
          { FilterExpression: 'a = :a', ExpressionAttributeValues: { ':a': item.a } },
          {
            FilterExpression: '#a = :a',
            ExpressionAttributeValues: { ':a': item.a },
            ExpressionAttributeNames: { '#a': 'a' },
          },
        ], function (scanOpts: ScanRequest, cb: AsyncCallback) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).eql([ item ])
            should(res.body.Count).equal(1)
            should(res.body.ScannedCount).be.above(0)
            cb()
          })
        }, done)
      })
    })

    it('should return empty if no match', function (done) {
      var item = { a: { S: helpers.randomString() } }
      request(helpers.opts('PutItem', { TableName: helpers.testHashTable, Item: item }), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([
          { ScanFilter: { a: { ComparisonOperator: 'EQ', AttributeValueList: [ { S: helpers.randomString() } ] } } },
          { FilterExpression: 'a = :a', ExpressionAttributeValues: { ':a': { S: helpers.randomString() } } },
        ], function (scanOpts: ScanRequest, cb: AsyncCallback) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).eql([])
            should(res.body.Count).equal(0)
            should(res.body.ScannedCount).be.above(0)
            cb()
          })
        }, done)
      })
    })

    it('should scan by a non-id property (type N)', function (done) {
      var item: DynamoItem = { a: { S: helpers.randomString() }, b: { N: helpers.randomNumber() } },
        item2 = { a: { S: helpers.randomString() }, b: item.b },
        item3 = { a: { S: helpers.randomString() }, b: { N: helpers.randomNumber() } },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([
          { ScanFilter: { b: { ComparisonOperator: 'EQ', AttributeValueList: [ item.b ] } } },
          { FilterExpression: 'b = :b', ExpressionAttributeValues: { ':b': item.b } },
        ], function (scanOpts: ScanRequest, cb: AsyncCallback) {
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

    it('should scan by multiple properties', function (done) {
      var item: DynamoItem = { a: { S: helpers.randomString() }, date: { N: helpers.randomNumber() }, c: { N: helpers.randomNumber() } },
        item2 = { a: { S: helpers.randomString() }, date: item.date, c: item.c },
        item3 = { a: { S: helpers.randomString() }, date: item.date, c: { N: helpers.randomNumber() } },
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
            date: { ComparisonOperator: 'EQ', AttributeValueList: [ item.date ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: '#d = :date AND c = :c',
          ExpressionAttributeValues: { ':date': item.date, ':c': item.c },
          ExpressionAttributeNames: { '#d': 'date' },
        } ], function (scanOpts: ScanRequest, cb: AsyncCallback) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200, res.rawBody)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).have.length(2)
            should(res.body.Count).equal(2)
            cb()
          })
        }, done)
      })
    })

  })

})
