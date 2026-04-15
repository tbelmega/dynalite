var http = require('http')
import type {
  ConfiguredInstanceTestHelper,
  InstanceHelperOptions,
  InstanceSafeCleanupOptions,
  InstanceTestHelper,
  InstanceTestTablesOptions,
} from '../../../types/types';

var requestHelpers: {
  attachInstanceRequest: (helper: ConfiguredInstanceTestHelper) => void;
} = require('./request')
var safeCleanup: {
  attachInstanceSafeCleanup: (helper: ConfiguredInstanceTestHelper, options: InstanceSafeCleanupOptions) => void;
} = require('./safe-cleanup')
var tableLifecycle: {
  attachInstanceTableLifecycle: (helper: ConfiguredInstanceTestHelper) => void;
} = require('./table-lifecycle')
var tableData: {
  attachInstanceTableData: (helper: ConfiguredInstanceTestHelper) => void;
} = require('./table-data')
var testTables: {
  attachInstanceTestTables: (helper: ConfiguredInstanceTestHelper, options: InstanceTestTablesOptions) => void;
} = require('./test-tables')
var configure: {
  createConfiguredTestHelper: (
    options?: InstanceHelperOptions,
    shared?: { useRemoteDynamo?: boolean | string; runSlowTests?: boolean },
  ) => ConfiguredInstanceTestHelper;
} = require('./configure')

var useRemoteDynamo = process.env.REMOTE
var runSlowTests = true
if (useRemoteDynamo && !process.env.SLOW_TESTS) runSlowTests = false

http.globalAgent.maxSockets = Infinity

// TestHelpers factory function to encapsulate server and database management
function createTestHelper (options: InstanceHelperOptions = {}): InstanceTestHelper {
  var helper = configure.createConfiguredTestHelper(options, {
    useRemoteDynamo: useRemoteDynamo,
    runSlowTests: runSlowTests,
  }) as InstanceTestHelper

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
