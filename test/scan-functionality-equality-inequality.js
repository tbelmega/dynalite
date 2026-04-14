var helpers = require('./helpers'),
  should = require('should'),
  async = require('async')

var target = 'Scan',
  request = helpers.request,
  opts = helpers.opts.bind(null, target)

describe('scan - functionality', function () {


  describe('equality and inequality operators', function () {

    it('should scan by EQ on type B', function (done) {
      var item = { a: { S: helpers.randomString() }, b: { B: 'abcd' }, c: { S: helpers.randomString() } },
        item2 = { a: { S: helpers.randomString() }, b: { B: 'abcd' }, c: item.c },
        item3 = { a: { S: helpers.randomString() }, b: { B: 'Yg==' }, c: item.c },
        batchReq = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        async.forEach([ {
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
        batchReq = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        async.forEach([ {
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
        batchReq = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        async.forEach([ {
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
            res.body.Items.forEach(function (item) {
              should(item.b.NS).have.length(2)
              should(item.b.NS).containEql('1')
              should(item.b.NS).containEql('2')
              delete item.b
            })
            delete item.b
            delete item2.b
            should(res.body.Items).containEql(item)
            should(res.body.Items).containEql(item2)
            should(res.body.Items).have.length(2)
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
        batchReq = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        async.forEach([ {
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
        batchReq = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        async.forEach([ {
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
        batchReq = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        async.forEach([ {
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
        batchReq = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        async.forEach([ {
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
        batchReq = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        async.forEach([ {
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
        batchReq = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        async.forEach([ {
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
