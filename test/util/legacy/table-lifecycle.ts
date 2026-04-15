import type {
  DescribeTableResponseBody,
  HelperCallback,
  HelperHttpResponse,
  HelperResponseBody,
  HelperResponseCallback,
  HelperTableDefinition,
  LegacyTableLifecycleApi,
  LegacyTableLifecycleDependencies,
} from '../../../types/types';

function createLegacyTableLifecycle (dependencies: LegacyTableLifecycleDependencies): LegacyTableLifecycleApi {
  var request = dependencies.request
  var opts = dependencies.opts

  function createAndWait (table: HelperTableDefinition, done: HelperResponseCallback): void {
    request(opts('CreateTable', table), function (err: unknown, res?: HelperHttpResponse): void {
      if (err) return done(err)
      if (res == null || res.statusCode == null) return done(new Error('Missing response statusCode'))
      if (res.statusCode != 200) return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      setTimeout(waitUntilActive, 1000, table.TableName, done)
    })
  }

  function waitUntilActive (name: string, done: HelperResponseCallback): void {
    request(opts('DescribeTable', { TableName: name }), function (err: unknown, res?: HelperHttpResponse): void {
      if (err) return done(err)
      if (res == null || res.statusCode == null) return done(new Error('Missing response statusCode'))
      if (res.statusCode != 200) return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      var describeBody = getDescribeTableBody(res)
      if (describeBody?.Table?.TableStatus == 'ACTIVE' &&
          (!describeBody.Table.GlobalSecondaryIndexes ||
            describeBody.Table.GlobalSecondaryIndexes.every(function (index): boolean { return index.IndexStatus == 'ACTIVE' }))) {
        return done(null, res)
      }
      setTimeout(waitUntilActive, 1000, name, done)
    })
  }

  function waitUntilDeleted (name: string, done: HelperResponseCallback): void {
    request(opts('DescribeTable', { TableName: name }), function (err: unknown, res?: HelperHttpResponse): void {
      if (err) return done(err)
      if (res == null || res.statusCode == null) return done(new Error('Missing response statusCode'))
      if (hasDynamoErrorType(res.body, 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException'))
        return done(null, res)
      else if (res.statusCode != 200)
        return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      setTimeout(waitUntilDeleted, 1000, name, done)
    })
  }

  function waitUntilIndexesActive (name: string, done: HelperResponseCallback): void {
    request(opts('DescribeTable', { TableName: name }), function (err: unknown, res?: HelperHttpResponse): void {
      if (err) return done(err)
      if (res == null || res.statusCode == null) return done(new Error('Missing response statusCode'))
      if (res.statusCode != 200)
        return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      var describeBody = getDescribeTableBody(res)
      if (describeBody?.Table?.GlobalSecondaryIndexes?.every(function (index): boolean { return index.IndexStatus == 'ACTIVE' }))
        return done(null, res)
      setTimeout(waitUntilIndexesActive, 1000, name, done)
    })
  }

  function deleteWhenActive (name: string, done: HelperCallback = function (): void {}): void {
    waitUntilActive(name, function (err: unknown): void {
      if (err) return done(err)
      request(opts('DeleteTable', { TableName: name }), done)
    })
  }

  return {
    createAndWait: createAndWait,
    waitUntilActive: waitUntilActive,
    waitUntilDeleted: waitUntilDeleted,
    waitUntilIndexesActive: waitUntilIndexesActive,
    deleteWhenActive: deleteWhenActive,
  }
}

function getDescribeTableBody (res?: HelperHttpResponse): DescribeTableResponseBody | undefined {
  if (res == null || typeof res.body === 'string') return
  return res.body
}

function hasDynamoErrorType (body: HelperResponseBody, errorType: string): boolean {
  return typeof body !== 'string' && body.__type === errorType
}

module.exports = {
  createLegacyTableLifecycle: createLegacyTableLifecycle,
}
