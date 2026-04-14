// @ts-nocheck
function createConfiguredTestHelper (options, shared) {
  options = options || {}
  shared = shared || {}

  var helper = {
    options: options,
    server: null,
    port: options.port || getRandomPort(),
    useRemoteDynamo: options.useRemoteDynamo || shared.useRemoteDynamo,
    awsRegion: options.awsRegion || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    awsAccountId: options.awsAccountId || process.env.AWS_ACCOUNT_ID,
    version: options.version || 'DynamoDB_20120810',
    prefix: options.prefix || '__dynalite_test_',
    readCapacity: options.readCapacity || 10,
    writeCapacity: options.writeCapacity || 5,
    runSlowTests: options.runSlowTests !== undefined ? options.runSlowTests : shared.runSlowTests,
  }

  helper.randomString = function () {
    return ('AAAAAAAAA' + helper.randomNumber()).slice(-10)
  }

  helper.randomNumber = function () {
    return String(Math.random() * 0x100000000)
  }

  helper.randomName = function () {
    return helper.prefix + helper.randomString()
  }

  helper.testHashTable = helper.useRemoteDynamo ? '__dynalite_test_1' : helper.randomName()
  helper.testHashNTable = helper.useRemoteDynamo ? '__dynalite_test_2' : helper.randomName()
  helper.testRangeTable = helper.useRemoteDynamo ? '__dynalite_test_3' : helper.randomName()
  helper.testRangeNTable = helper.useRemoteDynamo ? '__dynalite_test_4' : helper.randomName()
  helper.testRangeBTable = helper.useRemoteDynamo ? '__dynalite_test_5' : helper.randomName()

  helper.requestOpts = helper.useRemoteDynamo ?
    { host: 'dynamodb.' + helper.awsRegion + '.amazonaws.com', method: 'POST' } :
    { host: '127.0.0.1', port: helper.port, method: 'POST' }

  return helper
}

function getRandomPort () {
  return 10000 + Math.round(Math.random() * 10000)
}

module.exports = {
  createConfiguredTestHelper: createConfiguredTestHelper,
}
