import type {
  InstanceHelperOptions,
  InstanceTestHelper,
  LegacyHelperExports,
} from '../types/types';

type TestHelpersModule = LegacyHelperExports & {
  createTestHelper: (options?: InstanceHelperOptions) => InstanceTestHelper;
};

var legacyHelpers: LegacyHelperExports = require('./util/legacy/helpers')
var instanceHelpers: TestHelpersModule = Object.assign(legacyHelpers, require('./util/instance/helpers'))

module.exports = instanceHelpers
