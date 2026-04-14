var helpers = require('./helpers'),
  should = require('should')

var target = 'Scan',
  request = helpers.request,
  opts = helpers.opts.bind(null, target)

describe('scan - functionality', function () {


  describe('segmented scan behavior', function () {

    it('should return items in same segment order', function (done) {
      var i, b = { S: helpers.randomString() }, items = [],
        firstHalf, secondHalf, batchReq = { RequestItems: {} },
        scanFilter = { b: { ComparisonOperator: 'EQ', AttributeValueList: [ b ] } }

      for (i = 0; i < 20; i++)
        items.push({ a: { S: String(i) }, b: b })

      batchReq.RequestItems[helpers.testHashTable] = items.map(function (item) {
        return { PutRequest: { Item: item } }
      })

      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)

        request(opts({
          TableName: helpers.testHashTable,
          Segment: 0,
          TotalSegments: 2,
          ScanFilter: scanFilter,
        }), function (err, res) {
          if (err) return done(err)
          should(res.statusCode).equal(200)
          should(res.body.Count).be.above(0)

          firstHalf = res.body.Items

          request(opts({
            TableName: helpers.testHashTable,
            Segment: 1,
            TotalSegments: 2,
            ScanFilter: scanFilter,
          }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            should(res.body.Count).be.above(0)

            secondHalf = res.body.Items

            should(secondHalf).have.length(items.length - firstHalf.length)

            request(opts({
              TableName: helpers.testHashTable,
              Segment: 0,
              TotalSegments: 4,
              ScanFilter: scanFilter,
            }), function (err, res) {
              if (err) return done(err)
              should(res.statusCode).equal(200)

              res.body.Items.forEach(function (item) {
                should(firstHalf).containEql(item)
              })

              request(opts({
                TableName: helpers.testHashTable,
                Segment: 1,
                TotalSegments: 4,
                ScanFilter: scanFilter,
              }), function (err, res) {
                if (err) return done(err)
                should(res.statusCode).equal(200)

                res.body.Items.forEach(function (item) {
                  should(firstHalf).containEql(item)
                })

                request(opts({
                  TableName: helpers.testHashTable,
                  Segment: 2,
                  TotalSegments: 4,
                  ScanFilter: scanFilter,
                }), function (err, res) {
                  if (err) return done(err)
                  should(res.statusCode).equal(200)

                  res.body.Items.forEach(function (item) {
                    should(secondHalf).containEql(item)
                  })

                  request(opts({
                    TableName: helpers.testHashTable,
                    Segment: 3,
                    TotalSegments: 4,
                    ScanFilter: scanFilter,
                  }), function (err, res) {
                    if (err) return done(err)
                    should(res.statusCode).equal(200)

                    res.body.Items.forEach(function (item) {
                      should(secondHalf).containEql(item)
                    })

                    done()
                  })
                })
              })
            })
          })
        })
      })
    })

    // XXX: This is very brittle, relies on knowing the hashing scheme
    it('should return items in string hash order', function (done) {
      var i, b = { S: helpers.randomString() }, items = [],
        batchReq = { RequestItems: {} },
        scanFilter = { b: { ComparisonOperator: 'EQ', AttributeValueList: [ b ] } }

      for (i = 0; i < 10; i++)
        items.push({ a: { S: String(i) }, b: b })

      items.push({ a: { S: 'aardman' }, b: b })
      items.push({ a: { S: 'hello' }, b: b })
      items.push({ a: { S: 'zapf' }, b: b })
      items.push({ a: { S: 'äáöü' }, b: b })

      batchReq.RequestItems[helpers.testHashTable] = items.map(function (item) {
        return { PutRequest: { Item: item } }
      })

      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)

        request(opts({ TableName: helpers.testHashTable, ScanFilter: scanFilter }), function (err, res) {
          if (err) return done(err)
          should(res.statusCode).equal(200)
          should(res.body.Count).equal(14)
          var keys = res.body.Items.map(function (item) {
            return item.a.S
          })
          should(keys).eql([ '2', '8', '9', '1', '6', 'hello', '0', '5', '4', 'äáöü', 'aardman', '7', '3', 'zapf' ])
          done()
        })
      })
    })

    // XXX: This is very brittle, relies on knowing the hashing scheme
    it('should return items in number hash order', function (done) {
      var i, b = { S: helpers.randomString() }, items = [],
        batchReq = { RequestItems: {} },
        scanFilter = { b: { ComparisonOperator: 'EQ', AttributeValueList: [ b ] } }

      for (i = 0; i < 10; i++)
        items.push({ a: { N: String(i) }, b: b })

      items.push({ a: { N: '-0.09' }, b: b })
      items.push({ a: { N: '999.9' }, b: b })
      items.push({ a: { N: '0.012345' }, b: b })
      items.push({ a: { N: '-999.9' }, b: b })

      batchReq.RequestItems[helpers.testHashNTable] = items.map(function (item) {
        return { PutRequest: { Item: item } }
      })

      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)

        request(opts({ TableName: helpers.testHashNTable, ScanFilter: scanFilter }), function (err, res) {
          if (err) return done(err)
          should(res.statusCode).equal(200)
          should(res.body.Count).equal(14)
          var keys = res.body.Items.map(function (item) {
            return item.a.N
          })
          should(keys).eql([ '7', '999.9', '8', '3', '2', '-999.9', '9', '4', '-0.09', '6', '1', '0', '0.012345', '5' ])
          done()
        })
      })
    })

    // XXX: This is very brittle, relies on knowing the hashing scheme
    it('should return items from correct string hash segments', function (done) {
      var batchReq = { RequestItems: {} }, items = [
        { a: { S: '3635' } },
        { a: { S: '228' } },
        { a: { S: '1668' } },
        { a: { S: '3435' } },
      ]
      batchReq.RequestItems[helpers.testHashTable] = items.map(function (item) {
        return { PutRequest: { Item: item } }
      })

      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)

        request(opts({ TableName: helpers.testHashTable, Segment: 0, TotalSegments: 4096 }), function (err, res) {
          if (err) return done(err)
          should(res.statusCode).equal(200)
          should(res.body.Items).containEql(items[0])
          should(res.body.Items).containEql(items[1])
          request(opts({ TableName: helpers.testHashTable, Segment: 1, TotalSegments: 4096 }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(items[2])
            request(opts({
              TableName: helpers.testHashTable,
              Segment: 4,
              TotalSegments: 4096,
            }), function (err, res) {
              if (err) return done(err)
              should(res.statusCode).equal(200)
              should(res.body.Items).containEql(items[3])
              done()
            })
          })
        })
      })
    })

    // XXX: This is very brittle, relies on knowing the hashing scheme
    it('should return items from correct number hash segments', function (done) {
      var batchReq = { RequestItems: {} }, items = [
        { a: { N: '251' } },
        { a: { N: '2388' } },
      ]
      batchReq.RequestItems[helpers.testHashNTable] = items.map(function (item) {
        return { PutRequest: { Item: item } }
      })

      request(helpers.opts('BatchWriteItem', batchReq), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)

        request(opts({ TableName: helpers.testHashNTable, Segment: 1, TotalSegments: 4096 }), function (err, res) {
          if (err) return done(err)
          should(res.statusCode).equal(200)
          should(res.body.Items).containEql(items[0])
          request(opts({
            TableName: helpers.testHashNTable,
            Segment: 4095,
            TotalSegments: 4096,
          }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            should(res.body.Items).containEql(items[1])
            done()
          })
        })
      })
    })

  })

})
