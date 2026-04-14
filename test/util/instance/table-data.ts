// @ts-nocheck
var async = require('async')

function attachInstanceTableData (helper) {
  helper.clearTable = function (name, keyNames, segments, done) {
    if (!done) { done = segments; segments = 2 }
    if (!Array.isArray(keyNames)) keyNames = [ keyNames ]

    function scanAndDelete (cb) {
      async.times(segments, function (n, cb) {
        helper.scanSegmentAndDelete(name, keyNames, segments, n, cb)
      }, function (err, segmentsHadKeys) {
        if (err) return cb(err)
        if (segmentsHadKeys.some(Boolean)) return scanAndDelete(cb)
        cb()
      })
    }

    scanAndDelete(done)
  }

  helper.scanSegmentAndDelete = function (tableName, keyNames, totalSegments, n, cb) {
    helper.request(helper.opts('Scan', { TableName: tableName, AttributesToGet: keyNames, Segment: n, TotalSegments: totalSegments }), function (err, res) {
      if (err) return cb(err)
      if (/ProvisionedThroughputExceededException/.test(res.body.__type)) {
        console.log('ProvisionedThroughputExceededException')
        return setTimeout(helper.scanSegmentAndDelete, 2000, tableName, keyNames, totalSegments, n, cb)
      }
      else if (res.statusCode != 200) {
        return cb(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      }
      if (!res.body.ScannedCount) return cb(null, false)

      var keys = res.body.Items, batchDeletes

      for (batchDeletes = []; keys.length; keys = keys.slice(25))
        batchDeletes.push(function (keys) {
          return function (cb) { helper.batchWriteUntilDone(tableName, { deletes: keys }, cb) }
        }(keys.slice(0, 25)))

      async.parallel(batchDeletes, function (err) {
        if (err) return cb(err)
        cb(null, true)
      })
    })
  }

  helper.replaceTable = function (name, keyNames, items, segments, done) {
    if (!done) { done = segments; segments = 2 }

    helper.clearTable(name, keyNames, segments, function (err) {
      if (err) return done(err)
      helper.batchBulkPut(name, items, segments, done)
    })
  }

  helper.batchBulkPut = function (name, items, segments, done) {
    if (!done) { done = segments; segments = 2 }

    var itemChunks = [], i
    for (i = 0; i < items.length; i += 25)
      itemChunks.push(items.slice(i, i + 25))

    async.eachLimit(itemChunks, segments, function (items, cb) { helper.batchWriteUntilDone(name, { puts: items }, cb) }, done)
  }

  helper.batchWriteUntilDone = function (name, actions, cb) {
    var batchReq = { RequestItems: {} }, batchRes = {}
    batchReq.RequestItems[name] = (actions.puts || []).map(function (item) { return { PutRequest: { Item: item } } })
      .concat((actions.deletes || []).map(function (key) { return { DeleteRequest: { Key: key } } }))

    async.doWhilst(
      function (cb) {
        helper.request(helper.opts('BatchWriteItem', batchReq), function (err, res) {
          if (err) return cb(err)
          batchRes = res
          if (res.body.UnprocessedItems && Object.keys(res.body.UnprocessedItems).length) {
            batchReq.RequestItems = res.body.UnprocessedItems
          }
          else if (/ProvisionedThroughputExceededException/.test(res.body.__type)) {
            console.log('ProvisionedThroughputExceededException')
            return setTimeout(cb, 2000)
          }
          else if (res.statusCode != 200) {
            return cb(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
          }
          cb()
        })
      },
      function (cb) {
        var result = (batchRes.body.UnprocessedItems && Object.keys(batchRes.body.UnprocessedItems).length) ||
        /ProvisionedThroughputExceededException/.test(batchRes.body.__type)
        cb(null, result)
      },
      cb,
    )
  }
}

module.exports = {
  attachInstanceTableData: attachInstanceTableData,
}
