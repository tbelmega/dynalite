// @ts-nocheck
var async = require('async')

function createLegacyTableData (dependencies) {
  var request = dependencies.request
  var opts = dependencies.opts

  function clearTable (name, keyNames, segments, done) {
    if (!done) { done = segments; segments = 2 }
    if (!Array.isArray(keyNames)) keyNames = [ keyNames ]

    scanAndDelete(done)

    function scanAndDelete (cb) {
      async.times(segments, scanSegmentAndDelete, function (err, segmentsHadKeys) {
        if (err) return cb(err)
        if (segmentsHadKeys.some(Boolean)) return scanAndDelete(cb)
        cb()
      })
    }

    function scanSegmentAndDelete (n, cb) {
      request(opts('Scan', { TableName: name, AttributesToGet: keyNames, Segment: n, TotalSegments: segments }), function (err, res) {
        if (err) return cb(err)
        if (/ProvisionedThroughputExceededException/.test(res.body.__type)) {
          console.log('ProvisionedThroughputExceededException')
          return setTimeout(scanSegmentAndDelete, 2000, n, cb)
        }
        else if (res.statusCode != 200) {
          return cb(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
        }
        if (!res.body.ScannedCount) return cb(null, false)

        var keys = res.body.Items, batchDeletes

        for (batchDeletes = []; keys.length; keys = keys.slice(25))
          batchDeletes.push(batchWriteUntilDone.bind(null, name, { deletes: keys.slice(0, 25) }))

        async.parallel(batchDeletes, function (err) {
          if (err) return cb(err)
          cb(null, true)
        })
      })
    }
  }

  function replaceTable (name, keyNames, items, segments, done) {
    if (!done) { done = segments; segments = 2 }

    clearTable(name, keyNames, segments, function (err) {
      if (err) return done(err)
      batchBulkPut(name, items, segments, done)
    })
  }

  function batchBulkPut (name, items, segments, done) {
    if (!done) { done = segments; segments = 2 }

    var itemChunks = [], i
    for (i = 0; i < items.length; i += 25)
      itemChunks.push(items.slice(i, i + 25))

    async.eachLimit(itemChunks, segments, function (items, cb) { batchWriteUntilDone(name, { puts: items }, cb) }, done)
  }

  function batchWriteUntilDone (name, actions, cb) {
    var batchReq = { RequestItems: {} }, batchRes = {}
    batchReq.RequestItems[name] = (actions.puts || []).map(function (item) { return { PutRequest: { Item: item } } })
      .concat((actions.deletes || []).map(function (key) { return { DeleteRequest: { Key: key } } }))

    async.doWhilst(
      function (cb) {
        request(opts('BatchWriteItem', batchReq), function (err, res) {
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

  return {
    clearTable: clearTable,
    replaceTable: replaceTable,
    batchBulkPut: batchBulkPut,
    batchWriteUntilDone: batchWriteUntilDone,
  }
}

module.exports = {
  createLegacyTableData: createLegacyTableData,
}
