var helpers = require('../../test/helpers'),
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


  describe('ordered comparison operators', function () {

    it('should scan by LE on type S', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: 'abd' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { S: 'abc\xff' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { S: 'abc' }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { S: 'abd\x00' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { S: 'ab' }, c: item.c },
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
            b: { ComparisonOperator: 'LE', AttributeValueList: [ item.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b <= :b AND c = :c',
          ExpressionAttributeValues: { ':b': item.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).have.length(4)
            should(res.body.Count).equal(4)
            cb()
          })
        }, done)
      })
    })

    it('should scan by LE on type N with decimals', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { N: '2' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { N: '1.9999' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { N: '1' }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { N: '2.00000001' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { N: '-0.5' }, c: item.c },
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
            b: { ComparisonOperator: 'LE', AttributeValueList: [ item.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b <= :b AND c = :c',
          ExpressionAttributeValues: { ':b': item.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).have.length(4)
            should(res.body.Count).equal(4)
            cb()
          })
        }, done)
      })
    })

    it('should scan by LE on type N without decimals', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { N: '2' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { N: '19999' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { N: '1' }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { N: '200000001' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { N: '-5' }, c: item.c },
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
            b: { ComparisonOperator: 'LE', AttributeValueList: [ item.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b <= :b AND c = :c',
          ExpressionAttributeValues: { ':b': item.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).have.length(3)
            should(res.body.Count).equal(3)
            cb()
          })
        }, done)
      })
    })

    it('should scan by LE on type B', function (done) {
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
            b: { ComparisonOperator: 'LE', AttributeValueList: [ item2.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b <= :b AND c = :c',
          ExpressionAttributeValues: { ':b': item2.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).have.length(4)
            should(res.body.Count).equal(4)
            cb()
          })
        }, done)
      })
    })

    it('should scan by LT on type S', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: 'abd' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { S: 'abc\xff' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { S: 'abc' }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { S: 'abd\x00' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { S: 'ab' }, c: item.c },
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
            b: { ComparisonOperator: 'LT', AttributeValueList: [ item.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b < :b AND c = :c',
          ExpressionAttributeValues: { ':b': item.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).have.length(3)
            should(res.body.Count).equal(3)
            cb()
          })
        }, done)
      })
    })

    it('should scan by LT on type N', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { N: '2' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { N: '1.9999' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { N: '1' }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { N: '2.00000001' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { N: '-0.5' }, c: item.c },
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
            b: { ComparisonOperator: 'LT', AttributeValueList: [ item.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b < :b AND c = :c',
          ExpressionAttributeValues: { ':b': item.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).have.length(3)
            should(res.body.Count).equal(3)
            cb()
          })
        }, done)
      })
    })

    it('should scan by LT on type B', function (done) {
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
            b: { ComparisonOperator: 'LT', AttributeValueList: [ item2.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b < :b AND c = :c',
          ExpressionAttributeValues: { ':b': item2.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item5)
            should(res.body.Items).have.length(3)
            should(res.body.Count).equal(3)
            cb()
          })
        }, done)
      })
    })

    it('should scan by GE on type S', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: 'abd' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { S: 'abc\xff' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { S: 'abc' }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { S: 'abd\x00' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { S: 'ab' }, c: item.c },
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
            b: { ComparisonOperator: 'GE', AttributeValueList: [ item3.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b >= :b AND c = :c',
          ExpressionAttributeValues: { ':b': item3.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).containEql(item3)
            should(res.body.Items).containEql(item4)
            should(res.body.Items).have.length(4)
            should(res.body.Count).equal(4)
            cb()
          })
        }, done)
      })
    })

    it('should scan by GE on type N', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { N: '2' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { N: '1.9999' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { N: '1' }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { N: '2.00000001' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { N: '-0.5' }, c: item.c },
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
            b: { ComparisonOperator: 'GE', AttributeValueList: [ item2.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b >= :b AND c = :c',
          ExpressionAttributeValues: { ':b': item2.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).containEql(item4)
            should(res.body.Items).have.length(3)
            should(res.body.Count).equal(3)
            cb()
          })
        }, done)
      })
    })

    it('should scan by GE on type B', function (done) {
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
            b: { ComparisonOperator: 'GE', AttributeValueList: [ item3.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b >= :b AND c = :c',
          ExpressionAttributeValues: { ':b': item3.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item2)
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

    it('should scan by GT on type S', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { S: 'abd' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { S: 'abc\xff' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { S: 'abc' }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { S: 'abd\x00' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { S: 'ab' }, c: item.c },
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
            b: { ComparisonOperator: 'GT', AttributeValueList: [ item3.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b > :b AND c = :c',
          ExpressionAttributeValues: { ':b': item3.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).containEql(item4)
            should(res.body.Items).have.length(3)
            should(res.body.Count).equal(3)
            cb()
          })
        }, done)
      })
    })

    it('should scan by GT on type N', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { N: '2' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { N: '1.9999' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { N: '1' }, c: item.c },
        item4 = { a: { S: helpers.randomString() }, b: { N: '2.00000001' }, c: item.c },
        item5 = { a: { S: helpers.randomString() }, b: { N: '-0.5' }, c: item.c },
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
            b: { ComparisonOperator: 'GT', AttributeValueList: [ item2.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b > :b AND c = :c',
          ExpressionAttributeValues: { ':b': item2.b, ':c': item.c },
        } ], function (scanOpts, cb) {
          scanOpts.TableName = helpers.testHashTable
          request(opts(scanOpts), function (err, res) {
            if (err) return cb(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item4)
            should(res.body.Items).have.length(2)
            should(res.body.Count).equal(2)
            cb()
          })
        }, done)
      })
    })

    it('should scan by GT on type B', function (done) {
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
            b: { ComparisonOperator: 'GT', AttributeValueList: [ item3.b ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: 'b > :b AND c = :c',
          ExpressionAttributeValues: { ':b': item3.b, ':c': item.c },
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
