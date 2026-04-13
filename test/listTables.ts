var should = require('should'),
  async = require('async'),
  helpers = require('../../test/helpers')

import type {
  AsyncCallback,
  ListTablesResponse,
  TestDynamoRequest,
  TestRequestOptions,
} from '../types/types'

var target = 'ListTables',
  request: (requestOptions: TestDynamoRequest, cb: (err: unknown, res: ListTablesResponse) => void) => void = helpers.request,
  randomName = helpers.randomName,
  opts: (data: TestDynamoRequest) => TestRequestOptions = helpers.opts.bind(null, target),
  assertType = helpers.assertType.bind(null, target),
  assertValidation = helpers.assertValidation.bind(null, target)

describe('listTables', function () {

  describe('serializations', function () {

    it('should return 400 if no body', function (done) {
      request({ headers: { 'x-amz-target': helpers.version + '.' + target } }, function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(400)
        should(res.body).eql({ __type: 'com.amazon.coral.service#SerializationException' })
        done()
      })
    })

    // it should not include ExclusiveStartTableName value in output

    it('should return SerializationException when ExclusiveStartTableName is not a string', function (done) {
      assertType('ExclusiveStartTableName', 'String', done)
    })

    it('should return SerializationException when Limit is not an integer', function (done) {
      assertType('Limit', 'Integer', done)
    })
  })

  describe('validations', function () {

    it('should return ValidationException for empty ExclusiveStartTableName', function (done) {
      assertValidation({ ExclusiveStartTableName: '' }, [
        'Value \'\' at \'exclusiveStartTableName\' failed to satisfy constraint: ' +
        'Member must satisfy regular expression pattern: [a-zA-Z0-9_.-]+',
        'Value \'\' at \'exclusiveStartTableName\' failed to satisfy constraint: ' +
        'Member must have length greater than or equal to 3',
      ], done)
    })

    it('should return ValidationExceptions for short ExclusiveStartTableName', function (done) {
      assertValidation({ ExclusiveStartTableName: 'a;', Limit: 500 }, [
        'Value \'a;\' at \'exclusiveStartTableName\' failed to satisfy constraint: ' +
        'Member must satisfy regular expression pattern: [a-zA-Z0-9_.-]+',
        'Value \'a;\' at \'exclusiveStartTableName\' failed to satisfy constraint: ' +
        'Member must have length greater than or equal to 3',
        'Value \'500\' at \'limit\' failed to satisfy constraint: ' +
        'Member must have value less than or equal to 100',
      ], done)
    })

    it('should return ValidationException for long ExclusiveStartTableName', function (done) {
      var name = '', i
      for (i = 0; i < 256; i++) name += 'a'
      assertValidation({ ExclusiveStartTableName: name },
        '1 validation error detected: ' +
        'Value \'' + name + '\' at \'exclusiveStartTableName\' failed to satisfy constraint: ' +
        'Member must have length less than or equal to 255', done)
    })

    it('should return ValidationException for low Limit', function (done) {
      assertValidation({ Limit: 0 },
        '1 validation error detected: ' +
        'Value \'0\' at \'limit\' failed to satisfy constraint: ' +
        'Member must have value greater than or equal to 1', done)
    })

    it('should return ValidationException for high Limit', function (done) {
      assertValidation({ Limit: 101 },
        '1 validation error detected: ' +
        'Value \'101\' at \'limit\' failed to satisfy constraint: ' +
        'Member must have value less than or equal to 100', done)
    })

  })

  describe('functionality', function () {

    it('should return 200 if no params and application/json', function (done) {
      var requestOpts = opts({})
      requestOpts.headers['Content-Type'] = 'application/json'
      request(requestOpts, function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        should(res.body.TableNames).be.an.instanceOf(Array)
        should(res.headers['x-amzn-requestid']).match(/^[0-9A-Z]{52}$/)
        should(res.headers['x-amz-crc32']).not.be.empty
        should(res.headers['content-type']).equal('application/json')
        should(res.headers['content-length']).equal(String(Buffer.byteLength(JSON.stringify(res.body), 'utf8')))
        done()
      })
    })

    it('should return 200 if no params and application/x-amz-json-1.0', function (done) {
      request(opts({}), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        should(res.body.TableNames).be.an.instanceOf(Array)
        should(res.headers['x-amzn-requestid']).match(/^[0-9A-Z]{52}$/)
        should(res.headers['x-amz-crc32']).not.be.empty
        should(res.headers['content-type']).equal('application/x-amz-json-1.0')
        should(res.headers['content-length']).equal(String(Buffer.byteLength(JSON.stringify(res.body), 'utf8')))
        done()
      })
    })

    it('should return 200 and CORS if Origin specified', function (done) {
      var requestOpts = opts({})
      requestOpts.headers.Origin = 'whatever'
      request(requestOpts, function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        should(res.headers['access-control-allow-origin']).equal('*')
        should(res.body.TableNames).be.an.instanceOf(Array)
        done()
      })
    })

    it('should return 200 if random attributes are supplied', function (done) {
      request(opts({ hi: 'yo', stuff: 'things' }), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        should(res.body.TableNames).be.an.instanceOf(Array)
        done()
      })
    })

    it('should return 200 if null attributes are supplied', function (done) {
      request(opts({ ExclusiveStartTableName: null, Limit: null }), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        should(res.body.TableNames).be.an.instanceOf(Array)
        done()
      })
    })

    it('should return 200 if correct types are supplied', function (done) {
      request(opts({ ExclusiveStartTableName: 'aaa', Limit: 100 }), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        should(res.body.TableNames).be.an.instanceOf(Array)
        done()
      })
    })

    it('should return 200 if using query string signing', function (done) {
      var requestOpts = opts({})
      requestOpts.signQuery = true
      request(requestOpts, function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        should(res.body.TableNames).be.an.instanceOf(Array)
        should(Object.keys(requestOpts.headers).sort()).eql([ 'Content-Type', 'Host', 'X-Amz-Target' ])
        done()
      })
    })

    it('should return list with new table in it', function (done) {
      var name = randomName(), table = {
        TableName: name,
        AttributeDefinitions: [ { AttributeName: 'a', AttributeType: 'S' } ],
        KeySchema: [ { KeyType: 'HASH', AttributeName: 'a' } ],
        ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
      }
      request(helpers.opts('CreateTable', table), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        request(opts({}), function (err, res) {
          if (err) return done(err)
          should(res.statusCode).equal(200)
          should(res.body.TableNames).containEql(name)
          done()
          helpers.deleteWhenActive(name)
        })
      })
    })

    it('should return list using ExclusiveStartTableName and Limit', function (done) {
      var names = [ randomName(), randomName() ].sort(),
        beforeName = helpers.strDecrement(names[0], /[a-zA-Z0-9_.-]+/, 255),
        table1 = {
          TableName: names[0],
          AttributeDefinitions: [ { AttributeName: 'a', AttributeType: 'S' } ],
          KeySchema: [ { KeyType: 'HASH', AttributeName: 'a' } ],
          ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
        },
        table2 = {
          TableName: names[1],
          AttributeDefinitions: [ { AttributeName: 'a', AttributeType: 'S' } ],
          KeySchema: [ { KeyType: 'HASH', AttributeName: 'a' } ],
          ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
        }

      async.parallel([
        request.bind(null, helpers.opts('CreateTable', table1)),
        request.bind(null, helpers.opts('CreateTable', table2)),
      ], function (err: unknown) {
        if (err) return done(err)

        async.parallel([
          function (done: AsyncCallback) {
            request(opts({ ExclusiveStartTableName: names[0] }), function (err, res) {
              if (err) return done(err)
              should(res.statusCode).equal(200)
              should(res.body.TableNames).not.containEql(names[0])
              should(res.body.TableNames).containEql(names[1])
              done()
            })
          },
          function (done: AsyncCallback) {
            request(opts({ ExclusiveStartTableName: beforeName }), function (err, res) {
              if (err) return done(err)
              should(res.statusCode).equal(200)
              should(res.body.TableNames).containEql(names[0])
              should(res.body.TableNames).containEql(names[1])
              done()
            })
          },
          function (done: AsyncCallback) {
            request(opts({ Limit: 1 }), function (err, res) {
              if (err) return done(err)
              should(res.statusCode).equal(200)
              should(res.body.TableNames).have.length(1)
              done()
            })
          },
          function (done: AsyncCallback) {
            request(opts({ ExclusiveStartTableName: beforeName, Limit: 1 }), function (err, res) {
              if (err) return done(err)
              should(res.statusCode).equal(200)
              should(res.body.TableNames).eql([ names[0] ])
              should(res.body.LastEvaluatedTableName).eql(names[0])
              done()
            })
          },
        ], function (err: unknown) {
          helpers.deleteWhenActive(names[0])
          helpers.deleteWhenActive(names[1])
          done(err)
        })

      })
    })

    it('should have no LastEvaluatedTableName if the limit is large enough', function (done) {
      request(opts({ Limit: 100 }), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        should(res.body.TableNames.length).be.above(0)
        should.not.exist(res.body.LastEvaluatedTableName)
        request(opts({ Limit: res.body.TableNames.length }), function (err, res) {
          if (err) return done(err)
          should(res.statusCode).equal(200)
          should.not.exist(res.body.LastEvaluatedTableName)
          done()
        })
      })
    })

  })

})
