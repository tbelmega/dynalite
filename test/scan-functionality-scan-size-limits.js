var helpers = require('./helpers'),
  should = require('should')

var target = 'Scan',
  request = helpers.request,
  opts = helpers.opts.bind(null, target),
  runSlowTests = helpers.runSlowTests

describe('scan - functionality', function () {


  describe('scan size limits', function () {

    // High capacity (~100 or more) needed to run this quickly
    if (runSlowTests) {
      it('should not return LastEvaluatedKey if just under limit for range table', function (done) {
        this.timeout(200000)

        var i, items = [], id = helpers.randomString(), e = new Array(41583).join('e'), eAttr = e.slice(0, 255)
        for (i = 0; i < 25; i++) {
          var item = { a: { S: id }, b: { S: ('000000' + i).slice(-6) }, c: { S: 'abcde' } }
          item[eAttr] = { S: e }
          items.push(item)
        }
        items[24][eAttr].S = new Array(41583).join('e')

        helpers.replaceTable(helpers.testRangeTable, [ 'a', 'b' ], items, function (err) {
          if (err) return done(err)

          request(opts({
            TableName: helpers.testRangeTable,
            Select: 'COUNT',
            ReturnConsumedCapacity: 'INDEXES',
            Limit: 26,
          }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            should(res.body).eql({
              Count: 25,
              ScannedCount: 25,
              ConsumedCapacity: {
                CapacityUnits: 128,
                Table: { CapacityUnits: 128 },
                TableName: helpers.testRangeTable,
              },
            })
            helpers.clearTable(helpers.testRangeTable, [ 'a', 'b' ], done)
          })
        })
      })

      it('should return LastEvaluatedKey if just over limit for range table', function (done) {
        this.timeout(200000)

        var i, items = [], id = helpers.randomString(), e = new Array(41597).join('e')
        for (i = 0; i < 25; i++)
          items.push({ a: { S: id }, b: { S: ('00000' + i).slice(-5) }, c: { S: 'abcde' }, e: { S: e } })
        items[24].e.S = new Array(41598).join('e')

        helpers.replaceTable(helpers.testRangeTable, [ 'a', 'b' ], items, function (err) {
          if (err) return done(err)

          request(opts({
            TableName: helpers.testRangeTable,
            Select: 'COUNT',
            ReturnConsumedCapacity: 'INDEXES',
          }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            should(res.body).eql({
              Count: 25,
              ScannedCount: 25,
              ConsumedCapacity: {
                CapacityUnits: 127.5,
                Table: { CapacityUnits: 127.5 },
                TableName: helpers.testRangeTable,
              },
              LastEvaluatedKey: { a: items[24].a, b: items[24].b },
            })
            helpers.clearTable(helpers.testRangeTable, [ 'a', 'b' ], done)
          })
        })
      })

      it('should not return LastEvaluatedKey if just under limit for number range table', function (done) {
        this.timeout(200000)

        var i, items = [], id = helpers.randomString(), e = new Array(41639).join('e'), eAttr = e.slice(0, 255)
        for (i = 0; i < 25; i++) {
          var item = { a: { S: id }, b: { N: ('00' + i).slice(-2) }, c: { S: 'abcde' } }
          item[eAttr] = { S: e }
          items.push(item)
        }
        items[24][eAttr].S = new Array(41653).join('e')

        helpers.replaceTable(helpers.testRangeNTable, [ 'a', 'b' ], items, function (err) {
          if (err) return done(err)

          request(opts({
            TableName: helpers.testRangeNTable,
            Select: 'COUNT',
            ReturnConsumedCapacity: 'INDEXES',
            Limit: 26,
          }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            should(res.body).eql({
              Count: 25,
              ScannedCount: 25,
              ConsumedCapacity: {
                CapacityUnits: 128,
                Table: { CapacityUnits: 128 },
                TableName: helpers.testRangeNTable,
              },
            })
            helpers.clearTable(helpers.testRangeNTable, [ 'a', 'b' ], done)
          })
        })
      })

      it('should return LastEvaluatedKey if just over limit for number range table', function (done) {
        this.timeout(200000)

        var i, items = [], id = helpers.randomString(), e = new Array(41639).join('e')
        for (i = 0; i < 25; i++)
          items.push({ a: { S: id }, b: { N: ('00' + i).slice(-2) }, c: { S: 'abcde' }, e: { S: e } })
        items[24].e.S = new Array(41654).join('e')

        helpers.replaceTable(helpers.testRangeNTable, [ 'a', 'b' ], items, function (err) {
          if (err) return done(err)

          request(opts({
            TableName: helpers.testRangeNTable,
            Select: 'COUNT',
            ReturnConsumedCapacity: 'INDEXES',
          }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            should(res.body).eql({
              Count: 25,
              ScannedCount: 25,
              ConsumedCapacity: {
                CapacityUnits: 127.5,
                Table: { CapacityUnits: 127.5 },
                TableName: helpers.testRangeNTable,
              },
              LastEvaluatedKey: { a: items[24].a, b: items[24].b },
            })
            helpers.clearTable(helpers.testRangeNTable, [ 'a', 'b' ], done)
          })
        })
      })

      it('should return all if just under limit with small attribute for hash table', function (done) {
        this.timeout(200000)

        var i, items = []
        for (i = 0; i < 25; i++)
          items.push({ a: { S: ('0' + i).slice(-2) } })

        helpers.replaceTable(helpers.testHashTable, 'a', items, function (err) {
          if (err) return done(err)

          request(opts({ TableName: helpers.testHashTable }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            items = res.body.Items
            should(items).have.length(25)

            var b = new Array(43412).join('b')

            for (i = 0; i < 25; i++) {
              if (i == 23) {
              // Second last item
                items[i].b = { S: b.slice(0, 43412 - 46) }
                items[i].c = { N: '12.3456' }
                items[i].d = { B: 'AQI=' }
                items[i].e = { SS: [ 'a', 'bc' ] }
                items[i].f = { NS: [ '1.23', '12.3' ] }
                items[i].g = { BS: [ 'AQI=', 'Ag==', 'AQ==' ] }
              }
              else if (i == 24) {
                items[i].b = { S: 'b' } // Last item doesn't matter
              }
              else {
                items[i].b = { S: b }
              }
            }

            helpers.replaceTable(helpers.testHashTable, 'a', items, 10, function (err) {
              if (err) return done(err)

              request(opts({
                TableName: helpers.testHashTable,
                Select: 'COUNT',
                ReturnConsumedCapacity: 'TOTAL',
              }), function (err, res) {
                if (err) return done(err)
                should(res.statusCode).equal(200)
                should(res.body.ScannedCount).equal(25)
                should(res.body.Count).equal(25)
                should(res.body.ConsumedCapacity.CapacityUnits).equal(127.5)
                helpers.clearTable(helpers.testHashTable, 'a', done)
              })
            })
          })
        })
      })

      it('should return all if just under limit with large attribute', function (done) {
        this.timeout(200000)

        var i, items = []
        for (i = 0; i < 25; i++)
          items.push({ a: { S: ('0' + i).slice(-2) } })

        helpers.replaceTable(helpers.testHashTable, 'a', items, function (err) {
          if (err) return done(err)

          request(opts({ TableName: helpers.testHashTable }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            items = res.body.Items
            should(items).have.length(25)

            var b = new Array(43412).join('b'), bAttr = b.slice(0, 255)

            for (i = 0; i < 25; i++) {
              if (i == 23) {
              // Second last item
                items[i].bfasfdsfdsa = { S: b.slice(0, 43412 - 46) }
                items[i].cfadsfdsaafds = { N: '12.3456' }
                items[i].dfasdfdafdsa = { B: 'AQI=' }
                items[i].efdasfdasfd = { SS: [ 'a', 'bc' ] }
                items[i].ffdsafsdfd = { NS: [ '1.23', '12.3' ] }
                items[i].gfsdfdsaafds = { BS: [ 'AQI=', 'Ag==', 'AQ==' ] }
              }
              else if (i == 24) {
                items[i].b = { S: 'b' }
              }
              else {
                items[i][bAttr] = { S: b }
              }
            }

            helpers.replaceTable(helpers.testHashTable, 'a', items, 10, function (err) {
              if (err) return done(err)

              request(opts({
                TableName: helpers.testHashTable,
                Select: 'COUNT',
                ReturnConsumedCapacity: 'TOTAL',
              }), function (err, res) {
                if (err) return done(err)
                should(res.statusCode).equal(200)
                should(res.body.ScannedCount).equal(25)
                should(res.body.Count).equal(25)
                should(res.body.ConsumedCapacity.CapacityUnits).equal(128)
                helpers.clearTable(helpers.testHashTable, 'a', done)
              })
            })
          })
        })
      })

      it('should return one less than all if just over limit with small attribute for hash table', function (done) {
        this.timeout(100000)

        var i, items = []
        for (i = 0; i < 25; i++)
          items.push({ a: { S: ('0' + i).slice(-2) } })

        helpers.replaceTable(helpers.testHashTable, 'a', items, function (err) {
          if (err) return done(err)

          request(opts({ TableName: helpers.testHashTable }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            items = res.body.Items
            should(items).have.length(25)

            var b = new Array(43412).join('b')

            for (i = 0; i < 25; i++) {
              if (i == 23) {
              // Second last item
                items[i].b = { S: b.slice(0, 43412 - 45) }
                items[i].c = { N: '12.3456' }
                items[i].d = { B: 'AQI=' }
                items[i].e = { SS: [ 'a', 'bc' ] }
                items[i].f = { NS: [ '1.23', '12.3' ] }
                items[i].g = { BS: [ 'AQI=', 'Ag==', 'AQ==' ] }
              }
              else if (i == 24) {
                items[i].b = { S: 'b' } // Last item doesn't matter
              }
              else {
                items[i].b = { S: b }
              }
            }

            helpers.replaceTable(helpers.testHashTable, 'a', items, 10, function (err) {
              if (err) return done(err)

              request(opts({
                TableName: helpers.testHashTable,
                Select: 'COUNT',
                ReturnConsumedCapacity: 'TOTAL',
              }), function (err, res) {
                if (err) return done(err)
                should(res.statusCode).equal(200)
                should(res.body.ScannedCount).equal(24)
                should(res.body.Count).equal(24)
                should(res.body.ConsumedCapacity.CapacityUnits).equal(127.5)
                helpers.clearTable(helpers.testHashTable, 'a', done)
              })
            })
          })
        })
      })

      it('should return all if just under limit for range table', function (done) {
        this.timeout(200000)

        var i, items = []
        for (i = 0; i < 25; i++)
          items.push({ a: { S: ('0' + i).slice(-2) }, b: { S: ('0' + i).slice(-2) } })

        helpers.replaceTable(helpers.testRangeTable, [ 'a', 'b' ], items, function (err) {
          if (err) return done(err)

          request(opts({ TableName: helpers.testRangeTable }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            items = res.body.Items
            should(items).have.length(25)

            var b = new Array(43381).join('b'), bAttr = b.slice(0, 255)

            for (i = 0; i < 25; i++) {
              if (i == 23) {
              // Second last item
                items[i].z = { S: b.slice(0, 43381 - 22) }
                items[i].y = { N: '12.3456' }
                items[i].x = { B: 'AQI=' }
                items[i].w = { SS: [ 'a', 'bc' ] }
                items[i].v = { NS: [ '1.23', '12.3' ] }
                items[i].u = { BS: [ 'AQI=', 'Ag==', 'AQ==' ] }
              }
              else if (i == 24) {
                items[i].z = { S: 'b' } // Last item doesn't matter
              }
              else {
                items[i][bAttr] = { S: b }
              }
            }

            helpers.replaceTable(helpers.testRangeTable, [ 'a', 'b' ], items, 10, function (err) {
              if (err) return done(err)

              request(opts({
                TableName: helpers.testRangeTable,
                Select: 'COUNT',
                ReturnConsumedCapacity: 'TOTAL',
              }), function (err, res) {
                if (err) return done(err)
                should(res.statusCode).equal(200)
                should(res.body.ScannedCount).equal(25)
                should(res.body.Count).equal(25)
                should(res.body.ConsumedCapacity.CapacityUnits).equal(128)
                helpers.clearTable(helpers.testRangeTable, [ 'a', 'b' ], done)
              })
            })
          })
        })
      })

      it('should return all if just over limit with less items for range table', function (done) {
        this.timeout(200000)

        var i, items = []
        for (i = 0; i < 13; i++)
          items.push({ a: { S: ('0' + i).slice(-2) }, b: { S: ('0000000' + i).slice(-7) } })

        helpers.replaceTable(helpers.testRangeTable, [ 'a', 'b' ], items, function (err) {
          if (err) return done(err)

          request(opts({ TableName: helpers.testRangeTable }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            items = res.body.Items
            should(items).have.length(13)

            var b = new Array(86648).join('b')

            for (i = 0; i < 13; i++) {
              if (i == 11) {
              // Second last item
                items[i].z = { S: b.slice(0, 86648 - 9) }
              }
              else if (i == 12) {
                items[i].z = { S: 'b' } // Last item doesn't matter, 127.5 capacity units
              // items[i][bAttr] = {S: b} // 138 capacity units
              }
              else {
                items[i].z = { S: b }
              }
            }

            helpers.replaceTable(helpers.testRangeTable, [ 'a', 'b' ], items, 10, function (err) {
              if (err) return done(err)

              request(opts({
                TableName: helpers.testRangeTable,
                Select: 'COUNT',
                ReturnConsumedCapacity: 'TOTAL',
              }), function (err, res) {
                if (err) return done(err)
                should(res.statusCode).equal(200)
                should(res.body.ScannedCount).equal(12)
                should(res.body.Count).equal(12)
                should(res.body.ConsumedCapacity.CapacityUnits).equal(127)
                helpers.clearTable(helpers.testRangeTable, [ 'a', 'b' ], done)
              })
            })
          })
        })
      })

      it('should return all if just over limit for range table', function (done) {
        this.timeout(200000)

        var i, items = []
        for (i = 0; i < 25; i++)
          items.push({ a: { S: ('0' + i).slice(-2) }, b: { S: ('0' + i).slice(-2) } })

        helpers.replaceTable(helpers.testRangeTable, [ 'a', 'b' ], items, function (err) {
          if (err) return done(err)

          request(opts({ TableName: helpers.testRangeTable }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            items = res.body.Items
            should(items).have.length(25)

            var b = new Array(43381).join('b')

            for (i = 0; i < 25; i++) {
              if (i == 23) {
              // Second last item
                items[i].z = { S: b.slice(0, 43381 - 21) }
                items[i].y = { N: '12.3456' }
                items[i].x = { B: 'AQI=' }
                items[i].w = { SS: [ 'a', 'bc' ] }
                items[i].v = { NS: [ '1.23', '12.3' ] }
                items[i].u = { BS: [ 'AQI=', 'Ag==', 'AQ==' ] }
              }
              else if (i == 24) {
                items[i].z = { S: 'b' } // Last item doesn't matter
              }
              else {
                items[i].z = { S: b }
              }
            }

            helpers.replaceTable(helpers.testRangeTable, [ 'a', 'b' ], items, 10, function (err) {
              if (err) return done(err)

              request(opts({
                TableName: helpers.testRangeTable,
                Select: 'COUNT',
                ReturnConsumedCapacity: 'TOTAL',
              }), function (err, res) {
                if (err) return done(err)
                should(res.statusCode).equal(200)
                should(res.body.ScannedCount).equal(24)
                should(res.body.Count).equal(24)
                should(res.body.ConsumedCapacity.CapacityUnits).equal(127.5)
                helpers.clearTable(helpers.testRangeTable, [ 'a', 'b' ], done)
              })
            })
          })
        })
      })

      it('should return one less than all if just over limit with large attribute', function (done) {
        this.timeout(100000)

        var i, items = []
        for (i = 0; i < 25; i++)
          items.push({ a: { S: ('0' + i).slice(-2) } })

        helpers.replaceTable(helpers.testHashTable, 'a', items, function (err) {
          if (err) return done(err)

          request(opts({ TableName: helpers.testHashTable }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            items = res.body.Items
            should(items).have.length(25)

            var b = new Array(43412).join('b'), bAttr = b.slice(0, 255)

            for (i = 0; i < 25; i++) {
              if (i == 23) {
              // Second last item
                items[i].bfasfdsfdsa = { S: b.slice(0, 43412 - 45) }
                items[i].cfadsfdsaafds = { N: '12.3456' }
                items[i].dfasdfdafdsa = { B: 'AQI=' }
                items[i].efdasfdasfd = { SS: [ 'a', 'bc' ] }
                items[i].ffdsafsdfd = { NS: [ '1.23', '12.3' ] }
                items[i].gfsdfdsaafds = { BS: [ 'AQI=', 'Ag==', 'AQ==' ] }
              }
              else if (i == 24) {
                items[i][bAttr] = { S: new Array(100).join('b') } // Last item doesn't matter
              }
              else {
                items[i][bAttr] = { S: b }
              }
            }

            helpers.replaceTable(helpers.testHashTable, 'a', items, 10, function (err) {
              if (err) return done(err)

              request(opts({
                TableName: helpers.testHashTable,
                Select: 'COUNT',
                ReturnConsumedCapacity: 'TOTAL',
              }), function (err, res) {
                if (err) return done(err)
                should(res.statusCode).equal(200)
                should(res.body.ScannedCount).equal(24)
                should(res.body.Count).equal(24)
                should(res.body.ConsumedCapacity.CapacityUnits).equal(128)
                helpers.clearTable(helpers.testHashTable, 'a', done)
              })
            })
          })
        })
      })
    }

    // Upper bound seems to vary – tends to return a 500 above 30000 args
    it('should allow scans at least for 27500 args to IN', function (done) {
      this.timeout(100000)
      var attrValList = [], i
      for (i = 0; i < 27500; i++) attrValList.push({ S: 'a' })
      request(opts({
        TableName: helpers.testHashTable, ScanFilter: {
          a: { ComparisonOperator: 'IN', AttributeValueList: attrValList },
        },
      }), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        done()
      })
    })

  })

})
