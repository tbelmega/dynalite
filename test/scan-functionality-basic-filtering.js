var helpers = require('./helpers'),
  should = require('should'),
  async = require('async')

var target = 'Scan',
  request = helpers.request,
  opts = helpers.opts.bind(null, target)

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
      var item = { a: { S: helpers.randomString() } }
      request(helpers.opts('PutItem', { TableName: helpers.testHashTable, Item: item }), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        async.forEach([
          { ScanFilter: { a: { ComparisonOperator: 'EQ', AttributeValueList: [ item.a ] } } },
          { FilterExpression: 'a = :a', ExpressionAttributeValues: { ':a': item.a } },
          {
            FilterExpression: '#a = :a',
            ExpressionAttributeValues: { ':a': item.a },
            ExpressionAttributeNames: { '#a': 'a' },
          },
        ], function (scanOpts, cb) {
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
        async.forEach([
          { ScanFilter: { a: { ComparisonOperator: 'EQ', AttributeValueList: [ { S: helpers.randomString() } ] } } },
          { FilterExpression: 'a = :a', ExpressionAttributeValues: { ':a': { S: helpers.randomString() } } },
        ], function (scanOpts, cb) {
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
      var item = { a: { S: helpers.randomString() }, b: { N: helpers.randomNumber() } },
        item2 = { a: { S: helpers.randomString() }, b: item.b },
        item3 = { a: { S: helpers.randomString() }, b: { N: helpers.randomNumber() } },
        batchReq = { RequestItems: {} }
      batchReq.RequestItems[helpers.testHashTable] = [
        { PutRequest: { Item: item } },
        { PutRequest: { Item: item2 } },
        { PutRequest: { Item: item3 } },
      ]
      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        async.forEach([
          { ScanFilter: { b: { ComparisonOperator: 'EQ', AttributeValueList: [ item.b ] } } },
          { FilterExpression: 'b = :b', ExpressionAttributeValues: { ':b': item.b } },
        ], function (scanOpts, cb) {
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
      var item = { a: { S: helpers.randomString() }, date: { N: helpers.randomNumber() }, c: { N: helpers.randomNumber() } },
        item2 = { a: { S: helpers.randomString() }, date: item.date, c: item.c },
        item3 = { a: { S: helpers.randomString() }, date: item.date, c: { N: helpers.randomNumber() } },
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
            date: { ComparisonOperator: 'EQ', AttributeValueList: [ item.date ] },
            c: { ComparisonOperator: 'EQ', AttributeValueList: [ item.c ] },
          },
        }, {
          FilterExpression: '#d = :date AND c = :c',
          ExpressionAttributeValues: { ':date': item.date, ':c': item.c },
          ExpressionAttributeNames: { '#d': 'date' },
        } ], function (scanOpts, cb) {
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
