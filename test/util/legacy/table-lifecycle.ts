// @ts-nocheck
function createLegacyTableLifecycle (dependencies) {
  var request = dependencies.request
  var opts = dependencies.opts

  function createAndWait (table, done) {
    request(opts('CreateTable', table), function (err, res) {
      if (err) return done(err)
      if (res.statusCode != 200) return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      setTimeout(waitUntilActive, 1000, table.TableName, done)
    })
  }

  function waitUntilActive (name, done) {
    request(opts('DescribeTable', { TableName: name }), function (err, res) {
      if (err) return done(err)
      if (res.statusCode != 200) return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      if (res.body.Table.TableStatus == 'ACTIVE' &&
          (!res.body.Table.GlobalSecondaryIndexes ||
            res.body.Table.GlobalSecondaryIndexes.every(function (index) { return index.IndexStatus == 'ACTIVE' }))) {
        return done(null, res)
      }
      setTimeout(waitUntilActive, 1000, name, done)
    })
  }

  function waitUntilDeleted (name, done) {
    request(opts('DescribeTable', { TableName: name }), function (err, res) {
      if (err) return done(err)
      if (res.body && res.body.__type == 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException')
        return done(null, res)
      else if (res.statusCode != 200)
        return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      setTimeout(waitUntilDeleted, 1000, name, done)
    })
  }

  function waitUntilIndexesActive (name, done) {
    request(opts('DescribeTable', { TableName: name }), function (err, res) {
      if (err) return done(err)
      if (res.statusCode != 200)
        return done(new Error(res.statusCode + ': ' + JSON.stringify(res.body)))
      else if (res.body.Table.GlobalSecondaryIndexes.every(function (index) { return index.IndexStatus == 'ACTIVE' }))
        return done(null, res)
      setTimeout(waitUntilIndexesActive, 1000, name, done)
    })
  }

  function deleteWhenActive (name, done) {
    if (!done) done = function () { }
    waitUntilActive(name, function (err) {
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

module.exports = {
  createLegacyTableLifecycle: createLegacyTableLifecycle,
}
