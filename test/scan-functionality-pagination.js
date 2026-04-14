var helpers = require('./helpers'),
  should = require('should')

var target = 'Scan',
  request = helpers.request,
  opts = helpers.opts.bind(null, target)

describe('scan - functionality', function () {


  describe('pagination', function () {

    it('should return after but not including ExclusiveStartKey', function (done) {
      var i, b = { S: helpers.randomString() }, items = [], batchReq = { RequestItems: {} },
        scanFilter = { b: { ComparisonOperator: 'EQ', AttributeValueList: [ b ] } }

      for (i = 0; i < 10; i++)
        items.push({ a: { S: String(i) }, b: b })

      batchReq.RequestItems[helpers.testHashTable] = items.map(function (item) {
        return { PutRequest: { Item: item } }
      })

      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)

        request(opts({ TableName: helpers.testHashTable, ScanFilter: scanFilter }), function (err, res) {
          if (err) return done(err)
          should(res.statusCode).equal(200)
          should(res.body.Count).equal(10)

          request(opts({
            TableName: helpers.testHashTable,
            ScanFilter: scanFilter,
            ExclusiveStartKey: { a: res.body.Items[0].a },
          }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            should(res.body.Count).equal(9)
            done()
          })
        })
      })
    })

    it('should succeed even if ExclusiveStartKey does not match scan filter', function (done) {
      var hashes = [ helpers.randomString(), helpers.randomString() ].sort()
      request(opts({
        TableName: helpers.testHashTable,
        ExclusiveStartKey: { a: { S: hashes[1] } },
        ScanFilter: { a: { ComparisonOperator: 'EQ', AttributeValueList: [ { S: hashes[0] } ] } },
      }), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        should(res.body.Count).equal(0)
        should(res.body.Items).eql([])
        done()
      })
    })

    it('should return LastEvaluatedKey if Limit not reached', function (done) {
      var i, b = { S: helpers.randomString() }, items = [], batchReq = { RequestItems: {} }

      for (i = 0; i < 5; i++)
        items.push({ a: { S: String(i) }, b: b })

      batchReq.RequestItems[helpers.testHashTable] = items.map(function (item) {
        return { PutRequest: { Item: item } }
      })

      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)

        request(opts({
          TableName: helpers.testHashTable,
          Limit: 3,
          ReturnConsumedCapacity: 'INDEXES',
        }), function (err, res) {
          if (err) return done(err)
          should(res.statusCode).equal(200)
          should(res.body.ScannedCount).equal(3)
          should(res.body.LastEvaluatedKey.a.S).not.be.empty
          should(Object.keys(res.body.LastEvaluatedKey)).have.length(1)
          done()
        })
      })
    })

    it('should return LastEvaluatedKey even if selecting Count', function (done) {
      var i, b = { S: helpers.randomString() }, items = [], batchReq = { RequestItems: {} }

      for (i = 0; i < 5; i++)
        items.push({ a: { S: String(i) }, b: b })

      batchReq.RequestItems[helpers.testHashTable] = items.map(function (item) {
        return { PutRequest: { Item: item } }
      })

      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)

        request(opts({ TableName: helpers.testHashTable, Limit: 3, Select: 'COUNT' }), function (err, res) {
          if (err) return done(err)
          should(res.statusCode).equal(200)
          should(res.body.ScannedCount).equal(3)
          should(res.body.LastEvaluatedKey.a.S).not.be.empty
          should(Object.keys(res.body.LastEvaluatedKey)).have.length(1)
          done()
        })
      })
    })

    it('should return LastEvaluatedKey while filtering, even if Limit is smaller than the expected return list', function (done) {
      var i, items = [], batchReq = { RequestItems: {} }

      // This bug manifests itself when the sought after item is not among the first .Limit number of
      // items in the scan.  Because we can't guarantee the order of the returned scan items, we can't
      // guarantee that this test case will produce the bug.  Therefore, we will try to make it very
      // likely that this bug will be reproduced by adding as many items as we can.  The chances that
      // the sought after item (to be picked up by the filter) will be among the first .Limit number
      // of items should be small enough to give us practical assurance of correctness in this one
      // regard...
      for (i = 0; i < 25; i++)
        items.push({ a: { S: 'item' + i } })

      batchReq.RequestItems[helpers.testHashTable] = items.map(function (item) {
        return { PutRequest: { Item: item } }
      })

      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)

        request(opts({
          TableName: helpers.testHashTable,
          ExpressionAttributeNames: { '#key': 'a' },
          ExpressionAttributeValues: { ':value': { S: 'item12' } },
          FilterExpression: '#key = :value',
          Limit: 2,
        }), function (err, res) {
          if (err) return done(err)

          should(res.statusCode).equal(200)
          should(res.body.ScannedCount).equal(2)
          should(res.body.LastEvaluatedKey.a.S).not.be.empty
          should(Object.keys(res.body.LastEvaluatedKey)).have.length(1)
          helpers.clearTable(helpers.testHashTable, 'a', done)
        })
      })
    })

    it('should not return LastEvaluatedKey if Limit is large', function (done) {
      var i, b = { S: helpers.randomString() }, items = [], batchReq = { RequestItems: {} },
        scanFilter = { b: { ComparisonOperator: 'EQ', AttributeValueList: [ b ] } }

      for (i = 0; i < 5; i++)
        items.push({ a: { S: String(i) }, b: b })

      batchReq.RequestItems[helpers.testHashTable] = items.map(function (item) {
        return { PutRequest: { Item: item } }
      })

      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)

        request(opts({
          TableName: helpers.testHashTable,
          AttributesToGet: [ 'a', 'b' ],
          Limit: 100000,
        }), function (err, res) {
          if (err) return done(err)
          should(res.statusCode).equal(200)
          should(res.body.Count).equal(res.body.ScannedCount)
          should.not.exist(res.body.LastEvaluatedKey)
          for (var i = 0, lastIx = 0; i < res.body.Count; i++) {
            if (res.body.Items[i].b.S == b.S) lastIx = i
          }
          var totalItems = res.body.Count
          request(opts({
            TableName: helpers.testHashTable,
            ScanFilter: scanFilter,
            Limit: lastIx,
          }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            should(res.body.Count).equal(4)
            should(res.body.LastEvaluatedKey.a.S).not.be.empty
            request(opts({
              TableName: helpers.testHashTable,
              ScanFilter: scanFilter,
              Limit: lastIx + 1,
            }), function (err, res) {
              if (err) return done(err)
              should(res.statusCode).equal(200)
              should(res.body.Count).equal(5)
              should(res.body.LastEvaluatedKey.a.S).not.be.empty
              request(opts({
                TableName: helpers.testHashTable,
                ScanFilter: scanFilter,
                Limit: totalItems,
              }), function (err, res) {
                if (err) return done(err)
                should(res.statusCode).equal(200)
                should(res.body.Count).equal(5)
                should(res.body.LastEvaluatedKey.a.S).not.be.empty
                request(opts({
                  TableName: helpers.testHashTable,
                  ScanFilter: scanFilter,
                  Limit: totalItems + 1,
                }), function (err, res) {
                  if (err) return done(err)
                  should(res.statusCode).equal(200)
                  should(res.body.Count).equal(5)
                  should.not.exist(res.body.LastEvaluatedKey)
                  done()
                })
              })
            })
          })
        })
      })
    })

  })

})
