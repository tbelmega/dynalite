import type {
  ConfiguredInstanceTestHelper,
  HelperRequestDefaults,
  InstanceHelperOptions,
  InstanceHelperSharedOptions,
} from '../../../types/types';

function createConfiguredTestHelper (
  options: InstanceHelperOptions = {},
  shared: InstanceHelperSharedOptions = {},
): ConfiguredInstanceTestHelper {
  var port = options.port || getRandomPort()
  var useRemoteDynamo = options.useRemoteDynamo || shared.useRemoteDynamo
  var awsRegion = options.awsRegion || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
  var awsAccountId = options.awsAccountId || process.env.AWS_ACCOUNT_ID
  var version = options.version || 'DynamoDB_20120810'
  var prefix = options.prefix || '__dynalite_test_'
  var readCapacity = options.readCapacity || 10
  var writeCapacity = options.writeCapacity || 5
  var runSlowTests = options.runSlowTests !== undefined ? options.runSlowTests : shared.runSlowTests

  function randomNumber (): string {
    return String(Math.random() * 0x100000000)
  }

  function randomString (): string {
    return ('AAAAAAAAA' + randomNumber()).slice(-10)
  }

  function randomName (): string {
    return prefix + randomString()
  }

  var testHashTable = useRemoteDynamo ? '__dynalite_test_1' : randomName()
  var testHashNTable = useRemoteDynamo ? '__dynalite_test_2' : randomName()
  var testRangeTable = useRemoteDynamo ? '__dynalite_test_3' : randomName()
  var testRangeNTable = useRemoteDynamo ? '__dynalite_test_4' : randomName()
  var testRangeBTable = useRemoteDynamo ? '__dynalite_test_5' : randomName()

  var requestOpts: HelperRequestDefaults = useRemoteDynamo ?
    { host: 'dynamodb.' + awsRegion + '.amazonaws.com', method: 'POST' } :
    { host: '127.0.0.1', port: port, method: 'POST' }

  return {
    options: options,
    server: null,
    port: port,
    useRemoteDynamo: useRemoteDynamo,
    awsRegion: awsRegion,
    awsAccountId: awsAccountId,
    version: version,
    prefix: prefix,
    readCapacity: readCapacity,
    writeCapacity: writeCapacity,
    runSlowTests: runSlowTests,
    randomString: randomString,
    randomNumber: randomNumber,
    randomName: randomName,
    testHashTable: testHashTable,
    testHashNTable: testHashNTable,
    testRangeTable: testRangeTable,
    testRangeNTable: testRangeNTable,
    testRangeBTable: testRangeBTable,
    requestOpts: requestOpts,
  }
}

function getRandomPort (): number {
  return 10000 + Math.round(Math.random() * 10000)
}

module.exports = {
  createConfiguredTestHelper: createConfiguredTestHelper,
}
