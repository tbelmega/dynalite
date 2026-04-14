// @ts-nocheck
var http = require('http')
var requestHelpers = require('./request')
var safeCleanup = require('./safe-cleanup')
var tableLifecycle = require('./table-lifecycle')
var tableData = require('./table-data')
var testTables = require('./test-tables')
var configure = require('./configure')

var useRemoteDynamo = process.env.REMOTE
var runSlowTests = true
if (useRemoteDynamo && !process.env.SLOW_TESTS) runSlowTests = false

http.globalAgent.maxSockets = Infinity

// TestHelpers factory function to encapsulate server and database management
function createTestHelper (options) {
  var helper = configure.createConfiguredTestHelper(options, {
    useRemoteDynamo: useRemoteDynamo,
    runSlowTests: runSlowTests,
  })

  requestHelpers.attachInstanceRequest(helper)
  safeCleanup.attachInstanceSafeCleanup(helper, {
    deleteRemoteTables: DELETE_REMOTE_TABLES,
  })
  tableLifecycle.attachInstanceTableLifecycle(helper)
  tableData.attachInstanceTableData(helper)
  testTables.attachInstanceTestTables(helper, {
    createRemoteTables: CREATE_REMOTE_TABLES,
  })

  return helper
}

// Keep these flags module-local (and overrideable via env) for instance helpers.
var CREATE_REMOTE_TABLES = true
var DELETE_REMOTE_TABLES = true

module.exports = {
  createTestHelper: createTestHelper,
}
