var helpers = require('./helpers'),
  should = require('should'),
  async = require('async')

import type {
  AsyncCallback,
  BatchWriteRequest,
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


  describe('attribute and membership operators', function () {

    it('should scan by NOT_NULL', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: helpers.randomString() }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { S: helpers.randomString() }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, c: item.c },
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
            b: { ComparisonOperator: 'NOT_NULL' },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'attribute_exists(b) AND c = :c',
          ExpressionAttributeValues: { ':c': item.c },
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

    it('should scan by NULL', function (done) {
      var item = { a: { S: helpers.randomString() }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { S: helpers.randomString() }, c: item.c },
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
            b: { ComparisonOperator: 'NULL' },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'attribute_not_exists(b) AND c = :c',
          ExpressionAttributeValues: { ':c': item.c },
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

    it('should scan by CONTAINS on type S', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: 'abdef' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { SS: [ 'abd', 'bde' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('abdef').toString('base64') }, c: item.c },
        item4 = {
          a: { S: helpers.randomString() },
          b: { BS: [ 'abcd', Buffer.from('bde').toString('base64') ] },
          c: item.c,
        },
        item5 = { a: { S: helpers.randomString() }, b: { S: 'bde' }, c: item.c },
        item6 = { a: { S: helpers.randomString() }, b: { S: 'abd' }, c: item.c },
        item7 = { a: { S: helpers.randomString() }, b: { L: [ { 'N': '123' }, { 'S': 'bde' } ] }, c: item.c },
        item8 = { a: { S: helpers.randomString() }, b: { L: [ { 'S': 'abd' } ] }, c: item.c },
        item9 = { a: { S: helpers.randomString() }, b: { L: [ { 'S': 'abde' } ] }, c: item.c },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
        { PutRequest: { Item: item4 } },
        { PutRequest: { Item: item5 } },
        { PutRequest: { Item: item6 } },
        { PutRequest: { Item: item7 } },
        { PutRequest: { Item: item8 } },
        { PutRequest: { Item: item9 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'CONTAINS', AttributeValueList: [ item5.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'contains(b, :b) AND c = :c',
          ExpressionAttributeValues: { ':b': item5.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).containEql(item7)
            should(res.body.Items).have.length(4)
            should(res.body.Count).equal(4)
            cb()
          })
        }, done)
      })
    })

    it('should scan by CONTAINS on type N', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { N: '1234' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { NS: [ '123', '234' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('1234').toString('base64') }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { BS: [ Buffer.from('234').toString('base64') ] }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { SS: [ '234' ] }, c: item.c },
        item6 = { a: { S: helpers.randomString() }, b: { L: [ { 'S': 'abd' }, { 'N': '234' } ] }, c: item.c },
        item7 = { a: { S: helpers.randomString() }, b: { L: [ { 'N': '123' } ] }, c: item.c },
        item8 = { a: { S: helpers.randomString() }, b: { L: [ { 'N': '1234' } ] }, c: item.c },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
        { PutRequest: { Item: item4 } },
        { PutRequest: { Item: item5 } },
        { PutRequest: { Item: item6 } },
        { PutRequest: { Item: item7 } },
        { PutRequest: { Item: item8 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'CONTAINS', AttributeValueList: [ { N: '234' } ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'contains(b, :b) AND c = :c',
          ExpressionAttributeValues: { ':b': { N: '234' }, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).containEql(item6)
            should(res.body.Items).have.lengthOf(2)
            should(res.body.Count).equal(2)
            cb()
          })
        }, done)
      })
    })

    it('should scan by CONTAINS on type B', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: 'abdef' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { SS: [ 'abd', 'bde' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('abdef').toString('base64') }, c: item.c },
        item4 = {
          a: { S: helpers.randomString() },
          b: { BS: [ Buffer.from('bde').toString('base64'), 'abcd' ] },
          c: item.c,
        },
        item5 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('bde').toString('base64') }, c: item.c },
        item6 = { a: { S: helpers.randomString() }, b: { S: 'abd' }, c: item.c },
        item7 = {
          a: { S: helpers.randomString() },
          b: { L: [ { 'N': '123' }, { 'B': Buffer.from('bde').toString('base64') } ] },
          c: item.c,
        },
        item8 = { a: { S: helpers.randomString() }, b: { L: [ { 'B': Buffer.from('abd').toString('base64') } ] }, c: item.c },
        item9 = {
          a: { S: helpers.randomString() },
          b: { L: [ { 'B': Buffer.from('abde').toString('base64') } ] },
          c: item.c,
        },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
        { PutRequest: { Item: item4 } },
        { PutRequest: { Item: item5 } },
        { PutRequest: { Item: item6 } },
        { PutRequest: { Item: item7 } },
        { PutRequest: { Item: item8 } },
        { PutRequest: { Item: item9 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'CONTAINS', AttributeValueList: [ item5.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'contains(b, :b) AND c = :c',
          ExpressionAttributeValues: { ':b': item5.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item4)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).containEql(item7)
            should(res.body.Items).have.length(4)
            should(res.body.Count).equal(4)
            cb()
          })
        }, done)
      })
    })

    it('should scan by NOT_CONTAINS on type S', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: 'abdef' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { SS: [ 'abd', 'bde' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('abdef').toString('base64') }, c: item.c },
        item4 = {
          a: { S: helpers.randomString() },
          b: { BS: [ Buffer.from('bde').toString('base64'), 'abcd' ] },
          c: item.c,
        },
        item5 = { a: { S: helpers.randomString() }, b: { S: 'bde' }, c: item.c },
        item6 = { a: { S: helpers.randomString() }, b: { S: 'abd' }, c: item.c },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
        { PutRequest: { Item: item4 } },
        { PutRequest: { Item: item5 } },
        { PutRequest: { Item: item6 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'NOT_CONTAINS', AttributeValueList: [ item5.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'NOT contains(b, :b) AND c = :c',
          ExpressionAttributeValues: { ':b': item5.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item4)
            should(res.body.Items).containEql(item6)
            should(res.body.Items).have.length(3)
            should(res.body.Count).equal(3)
            cb()
          })
        }, done)
      })
    })

    it('should scan by NOT_CONTAINS on type N', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { N: '1234' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { NS: [ '123', '234' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('1234').toString('base64') }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { BS: [ Buffer.from('234').toString('base64') ] }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { SS: [ '234' ] }, c: item.c },
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
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'NOT_CONTAINS', AttributeValueList: [ { N: '234' } ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'NOT contains(b, :b) AND c = :c',
          ExpressionAttributeValues: { ':b': { N: '234' }, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item4)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).have.length(4)
            should(res.body.Count).equal(4)
            cb()
          })
        }, done)
      })
    })

    it('should scan by NOT_CONTAINS on type B', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: 'abdef' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { SS: [ 'abd', 'bde' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('abdef').toString('base64') }, c: item.c },
        item4 = {
          a: { S: helpers.randomString() },
          b: { BS: [ Buffer.from('bde').toString('base64'), 'abcd' ] },
          c: item.c,
        },
        item5 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('bde').toString('base64') }, c: item.c },
        item6 = { a: { S: helpers.randomString() }, b: { S: 'abd' }, c: item.c },
        batchReq: BatchWriteRequest = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
        { PutRequest: { Item: item4 } },
        { PutRequest: { Item: item5 } },
        { PutRequest: { Item: item6 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'NOT_CONTAINS', AttributeValueList: [ item5.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'NOT contains(b, :b) AND c = :c',
          ExpressionAttributeValues: { ':b': item5.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).containEql(item6)
            should(res.body.Items).have.length(3)
            should(res.body.Count).equal(3)
            cb()
          })
        }, done)
      })
    })

    it('should scan by BEGINS_WITH on type S', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: 'abdef' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { SS: [ 'abd', 'bde' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('abdef').toString('base64') }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { S: 'ab' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { S: 'abd' }, c: item.c },
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
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'BEGINS_WITH', AttributeValueList: [ item5.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'begins_with(b, :b) AND c = :c',
          ExpressionAttributeValues: { ':b': item5.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).have.length(2)
            should(res.body.Count).equal(2)
            cb()
          })
        }, done)
      })
    })

    it('should scan by BEGINS_WITH on type B', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: 'abdef' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { SS: [ 'abd', 'bde' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('abdef').toString('base64') }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { S: 'ab' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('abd').toString('base64') }, c: item.c },
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
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'BEGINS_WITH', AttributeValueList: [ item5.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'begins_with(b, :b) AND c = :c',
          ExpressionAttributeValues: { ':b': item5.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).have.length(2)
            should(res.body.Count).equal(2)
            cb()
          })
        }, done)
      })
    })

    it('should scan by IN on type S', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: 'abdef' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { SS: [ 'abd', 'bde' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('abdef').toString('base64') }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { S: 'ab' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { S: 'abd' }, c: item.c },
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
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'IN', AttributeValueList: [ item5.b, item.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b IN (:b, :d) AND c = :c',
          ExpressionAttributeValues: { ':b': item5.b, ':c': item.c, ':d': item.b },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).have.length(2)
            should(res.body.Count).equal(2)
            cb()
          })
        }, done)
      })
    })

    it('should scan by IN on type N', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: '1234' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { NS: [ '1234' ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('1234').toString('base64') }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { N: '1234' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { N: '123.45' }, c: item.c },
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
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'IN', AttributeValueList: [ item4.b, item5.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b IN (:b, :d) AND c = :c',
          ExpressionAttributeValues: { ':b': item4.b, ':c': item.c, ':d': item5.b },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item4)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).have.length(2)
            should(res.body.Count).equal(2)
            cb()
          })
        }, done)
      })
    })

    it('should scan by IN on type B', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: '1234' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { BS: [ Buffer.from('1234').toString('base64') ] }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('1234').toString('base64') }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { N: '1234' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('12345').toString('base64') }, c: item.c },
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
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'IN', AttributeValueList: [ item3.b, item5.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b IN (:b, :d) AND c = :c',
          ExpressionAttributeValues: { ':b': item3.b, ':c': item.c, ':d': item5.b },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).have.length(2)
            should(res.body.Count).equal(2)
            cb()
          })
        }, done)
      })
    })

    it('should scan by BETWEEN on type S', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: 'abc' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { S: 'abd' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { S: 'abd\x00' }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { S: 'abe' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { S: 'abe\x00' }, c: item.c },
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
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'BETWEEN', AttributeValueList: [ item2.b, item4.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b BETWEEN :b AND :d AND c = :c',
          ExpressionAttributeValues: { ':b': item2.b, ':c': item.c, ':d': item4.b },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item4)
            should(res.body.Items).have.length(3)
            should(res.body.Count).equal(3)
            cb()
          })
        }, done)
      })
    })

    it('should scan by BETWEEN on type N', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { N: '123' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { N: '124' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { N: '124.99999' }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { N: '125' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { N: '125.000001' }, c: item.c },
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
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'BETWEEN', AttributeValueList: [ item2.b, item4.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b BETWEEN :b AND :d AND c = :c',
          ExpressionAttributeValues: { ':b': item2.b, ':c': item.c, ':d': item4.b },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item4)
            should(res.body.Items).have.length(3)
            should(res.body.Count).equal(3)
            cb()
          })
        }, done)
      })
    })

    it('should scan by BETWEEN on type B', function (done) {
      var item = {
          a: { S: helpers.randomString() },
          b: { B: Buffer.from('ce', 'hex').toString('base64') },
          c: { S: helpers.randomString() },
        },
        item2 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('d0', 'hex').toString('base64') }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('cf', 'hex').toString('base64') }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('d000', 'hex').toString('base64') }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { B: Buffer.from('cfff', 'hex').toString('base64') }, c: item.c },
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
        forEach<ScanRequest>([ {
          ScanFilter: {
            b: { ComparisonOperator: 'BETWEEN', AttributeValueList: [ item5.b, item4.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b BETWEEN :b AND :d AND c = :c',
          ExpressionAttributeValues: { ':b': item5.b, ':c': item.c, ':d': item4.b },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).containEql(item4)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).have.length(3)
            should(res.body.Count).equal(3)
            cb()
          })
        }, done)
      })
    })

  })

})
