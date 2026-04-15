var async = require('async')
import type {
  BatchWriteActions,
  DynamoItem,
  HelperCallback,
  HelperHttpResponse,
  HelperResponseBody,
  InstanceTestHelper,
  WriteRequest,
} from '../../../types/types';

function attachInstanceTableData (helper: InstanceTestHelper): void {
  helper.clearTable = function (name: string, keyNames: string | string[], segmentsOrDone: number | HelperCallback, done?: HelperCallback): void {
    var segments = typeof segmentsOrDone === 'number' ? segmentsOrDone : 2
    var finalDone = typeof segmentsOrDone === 'function' ? segmentsOrDone : done
    if (finalDone == null) throw new Error('Missing clearTable callback')
    var keyNameList = Array.isArray(keyNames) ? keyNames : [ keyNames ]

    function scanAndDelete (cb: HelperCallback): void {
      async.times(segments, function (n: number, segmentDone: (err?: unknown, hadKeys?: boolean) => void): void {
        helper.scanSegmentAndDelete(name, keyNameList, segments, n, segmentDone)
      }, function (err: unknown, segmentsHadKeys: boolean[]): void {
        if (err) return cb(err)
        if (segmentsHadKeys.some(Boolean)) return scanAndDelete(cb)
        cb()
      })
    }

    scanAndDelete(finalDone)
  }

  helper.scanSegmentAndDelete = function (tableName: string, keyNames: string[], totalSegments: number, n: number, cb: (err?: unknown, hadKeys?: boolean) => void): void {
    helper.request(helper.opts('Scan', { TableName: tableName, AttributesToGet: keyNames, Segment: n, TotalSegments: totalSegments }), function (err: unknown, res?: HelperHttpResponse): void {
      if (err) return cb(err)
      if (res == null || res.statusCode == null) return cb(new Error('Missing response statusCode'))
      if (hasProvisionedThroughputExceeded(res.body)) {
        console.log('ProvisionedThroughputExceededException')
        setTimeout(helper.scanSegmentAndDelete, 2000, tableName, keyNames, totalSegments, n, cb)
        return
      }
      if (res.statusCode != 200) {
        return cb(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      }
      var keys = getScanItems(res.body)
      if (keys == null || keys.length === 0) return cb(null, false)

      var batchDeletes: Array<(done: HelperCallback) => void> = []

      for (; keys.length; keys = keys.slice(25)) {
        batchDeletes.push(createDeleteBatch(tableName, keys.slice(0, 25), helper))
      }

      async.parallel(batchDeletes, function (parallelErr: unknown): void {
        if (parallelErr) return cb(parallelErr)
        cb(null, true)
      })
    })
  }

  helper.replaceTable = function (name: string, keyNames: string | string[], items: DynamoItem[], segmentsOrDone: number | HelperCallback, done?: HelperCallback): void {
    var segments = typeof segmentsOrDone === 'number' ? segmentsOrDone : 2
    var finalDone = typeof segmentsOrDone === 'function' ? segmentsOrDone : done
    if (finalDone == null) throw new Error('Missing replaceTable callback')
    var replaceDone: HelperCallback = finalDone

    helper.clearTable(name, keyNames, segments, function (err: unknown): void {
      if (err) return replaceDone(err)
      helper.batchBulkPut(name, items, segments, replaceDone)
    })
  }

  helper.batchBulkPut = function (name: string, items: DynamoItem[], segmentsOrDone: number | HelperCallback, done?: HelperCallback): void {
    var segments = typeof segmentsOrDone === 'number' ? segmentsOrDone : 2
    var finalDone = typeof segmentsOrDone === 'function' ? segmentsOrDone : done
    if (finalDone == null) throw new Error('Missing batchBulkPut callback')

    var itemChunks: DynamoItem[][] = [], i
    for (i = 0; i < items.length; i += 25)
      itemChunks.push(items.slice(i, i + 25))

    async.eachLimit(itemChunks, segments, function (chunk: DynamoItem[], cb: HelperCallback): void {
      helper.batchWriteUntilDone(name, { puts: chunk }, cb)
    }, finalDone)
  }

  helper.batchWriteUntilDone = function (name: string, actions: BatchWriteActions, cb: HelperCallback): void {
    var batchReq: { RequestItems: Record<string, WriteRequest[]> } = { RequestItems: {} }
    var batchRes: HelperHttpResponse | undefined
    var putRequests: WriteRequest[] = (actions.puts || []).map(function (item): WriteRequest { return { PutRequest: { Item: item } } })
    var deleteRequests: WriteRequest[] = (actions.deletes || []).map(function (key): WriteRequest { return { DeleteRequest: { Key: key } } })
    batchReq.RequestItems[name] = putRequests.concat(deleteRequests)

    async.doWhilst(
      function (loopDone: (err?: unknown) => void): void {
        helper.request(helper.opts('BatchWriteItem', batchReq), function (err: unknown, res?: HelperHttpResponse): void {
          if (err) return loopDone(err)
          if (res == null || res.statusCode == null) return loopDone(new Error('Missing response statusCode'))
          batchRes = res
          var unprocessedItems = getUnprocessedItems(res.body)
          if (unprocessedItems != null && Object.keys(unprocessedItems).length) {
            batchReq.RequestItems = unprocessedItems
          }
          else if (hasProvisionedThroughputExceeded(res.body)) {
            console.log('ProvisionedThroughputExceededException')
            setTimeout(loopDone, 2000)
            return
          }
          else if (res.statusCode !== 200) {
            return loopDone(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
          }
          loopDone()
        })
      },
      function (checkDone: (err?: unknown, result?: boolean) => void): void {
        var result = batchRes != null && (hasUnprocessedItems(batchRes.body) || hasProvisionedThroughputExceeded(batchRes.body))
        checkDone(null, result)
      },
      cb,
    )
  }
}

function createDeleteBatch (
  tableName: string,
  keys: DynamoItem[],
  helper: InstanceTestHelper,
): (done: HelperCallback) => void {
  return function (done: HelperCallback): void {
    helper.batchWriteUntilDone(tableName, { deletes: keys }, done)
  }
}

function hasProvisionedThroughputExceeded (body: HelperResponseBody): boolean {
  return typeof body !== 'string' && /ProvisionedThroughputExceededException/.test(body.__type || '')
}

function getScanItems (body: HelperResponseBody): DynamoItem[] | undefined {
  if (typeof body === 'string' || !Array.isArray(body.Items)) return
  return body.Items.filter(function (item: unknown): item is DynamoItem {
    return typeof item === 'object' && item != null
  })
}

function getUnprocessedItems (body: HelperResponseBody): Record<string, WriteRequest[]> | undefined {
  if (typeof body === 'string' || typeof body.UnprocessedItems !== 'object' || body.UnprocessedItems == null) return
  return body.UnprocessedItems as Record<string, WriteRequest[]>
}

function hasUnprocessedItems (body: HelperResponseBody): boolean {
  var unprocessedItems = getUnprocessedItems(body)
  return unprocessedItems != null && Object.keys(unprocessedItems).length > 0
}

module.exports = {
  attachInstanceTableData: attachInstanceTableData,
}
