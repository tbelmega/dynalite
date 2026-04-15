var async = require('async')
var should = require('should')
import type {
  HelperCallback,
  HelperHttpResponse,
  HelperResponseBody,
  LegacyAssertionsApi,
  LegacyAssertionsDependencies,
  LegacySerializationTestValue,
  LegacyValidationMessage,
} from '../../../types/types';

type LegacySerializationContainer = LegacySerializationTestValue[] | { [key: string]: LegacySerializationTestValue };
type LegacyTypeMessageCase = [LegacySerializationTestValue, string];
type LegacyAssertTypeCase = [string, string];
type HelperJsonBody = Exclude<HelperResponseBody, string>;

function createLegacyAssertions (dependencies: LegacyAssertionsDependencies): LegacyAssertionsApi {
  var request = dependencies.request
  var opts = dependencies.opts
  var assertSerialization = dependencies.assertSerialization

  function assertType (target: string, property: string, type: string, done: HelperCallback): void {
    var msgs: LegacyTypeMessageCase[] = []
    var pieces = property.split('.')
    var subtypeMatch = type.match(/(.+?)<(.+)>$/)
    var subtype: string | undefined
    if (subtypeMatch != null) {
      type = subtypeMatch[1]
      subtype = subtypeMatch[2]
    }
    var castMsg = "class sun.reflect.generics.reflectiveObjects.ParameterizedTypeImpl cannot be cast to class java.lang.Class (sun.reflect.generics.reflectiveObjects.ParameterizedTypeImpl and java.lang.Class are in module java.base of loader 'bootstrap')"
    switch (type) {
    case 'Boolean':
      msgs = [
        [ '23', 'Unexpected token received from parser' ],
        [ 23, 'NUMBER_VALUE cannot be converted to Boolean' ],
        [ -2147483648, 'NUMBER_VALUE cannot be converted to Boolean' ],
        [ 2147483648, 'NUMBER_VALUE cannot be converted to Boolean' ],
        [ 34.56, 'DECIMAL_VALUE cannot be converted to Boolean' ],
        [ [], 'Unrecognized collection type class java.lang.Boolean' ],
        [ {}, 'Start of structure or map found where not expected' ],
      ]
      break
    case 'String':
      msgs = [
        [ true, 'TRUE_VALUE cannot be converted to String' ],
        [ false, 'FALSE_VALUE cannot be converted to String' ],
        [ 23, 'NUMBER_VALUE cannot be converted to String' ],
        [ -2147483648, 'NUMBER_VALUE cannot be converted to String' ],
        [ 2147483648, 'NUMBER_VALUE cannot be converted to String' ],
        [ 34.56, 'DECIMAL_VALUE cannot be converted to String' ],
        [ [], 'Unrecognized collection type class java.lang.String' ],
        [ {}, 'Start of structure or map found where not expected' ],
      ]
      break
    case 'Integer':
      msgs = [
        [ '23', 'STRING_VALUE cannot be converted to Integer' ],
        [ true, 'TRUE_VALUE cannot be converted to Integer' ],
        [ false, 'FALSE_VALUE cannot be converted to Integer' ],
        [ [], 'Unrecognized collection type class java.lang.Integer' ],
        [ {}, 'Start of structure or map found where not expected' ],
      ]
      break
    case 'Long':
      msgs = [
        [ '23', 'STRING_VALUE cannot be converted to Long' ],
        [ true, 'TRUE_VALUE cannot be converted to Long' ],
        [ false, 'FALSE_VALUE cannot be converted to Long' ],
        [ [], 'Unrecognized collection type class java.lang.Long' ],
        [ {}, 'Start of structure or map found where not expected' ],
      ]
      break
    case 'Blob':
      msgs = [
        [ true, 'only base-64-encoded strings are convertible to bytes' ],
        [ 23, 'only base-64-encoded strings are convertible to bytes' ],
        [ -2147483648, 'only base-64-encoded strings are convertible to bytes' ],
        [ 2147483648, 'only base-64-encoded strings are convertible to bytes' ],
        [ 34.56, 'only base-64-encoded strings are convertible to bytes' ],
        [ [], 'Unrecognized collection type class java.nio.ByteBuffer' ],
        [ {}, 'Start of structure or map found where not expected' ],
        [ '23456', 'Base64 encoded length is expected a multiple of 4 bytes but found: 5' ],
        [ '=+/=', 'Invalid last non-pad Base64 character dectected' ],
        [ '+/+=', 'Invalid last non-pad Base64 character dectected' ],
      ]
      break
    case 'List':
      msgs = [
        [ '23', 'Unexpected field type' ],
        [ true, 'Unexpected field type' ],
        [ 23, 'Unexpected field type' ],
        [ -2147483648, 'Unexpected field type' ],
        [ 2147483648, 'Unexpected field type' ],
        [ 34.56, 'Unexpected field type' ],
        [ {}, 'Start of structure or map found where not expected' ],
      ]
      break
    case 'ParameterizedList':
      msgs = [
        [ '23', castMsg ],
        [ true, castMsg ],
        [ 23, castMsg ],
        [ -2147483648, castMsg ],
        [ 2147483648, castMsg ],
        [ 34.56, castMsg ],
        [ {}, 'Start of structure or map found where not expected' ],
      ]
      break
    case 'Map':
      msgs = [
        [ '23', 'Unexpected field type' ],
        [ true, 'Unexpected field type' ],
        [ 23, 'Unexpected field type' ],
        [ -2147483648, 'Unexpected field type' ],
        [ 2147483648, 'Unexpected field type' ],
        [ 34.56, 'Unexpected field type' ],
        [ [], 'Unrecognized collection type java.util.Map<java.lang.String, ' + getMapSubtypeName(subtype) + '>' ],
      ]
      break
    case 'ParameterizedMap':
      msgs = [
        [ '23', castMsg ],
        [ true, castMsg ],
        [ 23, castMsg ],
        [ -2147483648, castMsg ],
        [ 2147483648, castMsg ],
        [ 34.56, castMsg ],
        [ [], 'Unrecognized collection type java.util.Map<java.lang.String, com.amazonaws.dynamodb.v20120810.AttributeValue>' ],
      ]
      break
    case 'ValueStruct':
      msgs = [
        [ '23', 'Unexpected value type in payload' ],
        [ true, 'Unexpected value type in payload' ],
        [ 23, 'Unexpected value type in payload' ],
        [ -2147483648, 'Unexpected value type in payload' ],
        [ 2147483648, 'Unexpected value type in payload' ],
        [ 34.56, 'Unexpected value type in payload' ],
        [ [], 'Unrecognized collection type class com.amazonaws.dynamodb.v20120810.' + getSubtypeName(subtype) ],
      ]
      break
    case 'FieldStruct':
      msgs = [
        [ '23', 'Unexpected field type' ],
        [ true, 'Unexpected field type' ],
        [ 23, 'Unexpected field type' ],
        [ -2147483648, 'Unexpected field type' ],
        [ 2147483648, 'Unexpected field type' ],
        [ 34.56, 'Unexpected field type' ],
        [ [], 'Unrecognized collection type class com.amazonaws.dynamodb.v20120810.' + getSubtypeName(subtype) ],
      ]
      break
    case 'AttrStruct':
      async.forEach([
        [ property, getSubtypeName(subtype) + '<AttributeValue>' ],
        [ property + '.S', 'String' ],
        [ property + '.N', 'String' ],
        [ property + '.B', 'Blob' ],
        [ property + '.BOOL', 'Boolean' ],
        [ property + '.NULL', 'Boolean' ],
        [ property + '.SS', 'List' ],
        [ property + '.SS.0', 'String' ],
        [ property + '.NS', 'List' ],
        [ property + '.NS.0', 'String' ],
        [ property + '.BS', 'List' ],
        [ property + '.BS.0', 'Blob' ],
        [ property + '.L', 'List' ],
        [ property + '.L.0', 'ValueStruct<AttributeValue>' ],
        [ property + '.L.0.BS', 'List' ],
        [ property + '.L.0.BS.0', 'Blob' ],
        [ property + '.M', 'Map<AttributeValue>' ],
        [ property + '.M.a', 'ValueStruct<AttributeValue>' ],
        [ property + '.M.a.BS', 'List' ],
        [ property + '.M.a.BS.0', 'Blob' ],
      ], function (test: LegacyAssertTypeCase, cb: HelperCallback): void {
        assertType(target, test[0], test[1], cb)
      }, done)
      return
    default:
      throw new Error('Unknown type: ' + type)
    }
    async.forEach(msgs, function (msg: LegacyTypeMessageCase, cb: HelperCallback): void {
      assertSerialization(target, createNestedSerializationPayload(pieces, msg[0]), msg[1], cb)
    }, done)
  }

  function assertAccessDenied (target: string, data: unknown, msg: string | RegExp, done: HelperCallback): void {
    request(opts(target, data), function (err: unknown, res?: HelperHttpResponse): void {
      if (err) return done(err)
      if (res == null || res.statusCode == null) return done(new Error('Missing response statusCode'))
      should(res.statusCode).equal(400)
      var body = getJsonBody(res)
      if (body == null) return done(new Error('Not JSON: ' + res.body))
      should(body.__type).equal('com.amazon.coral.service#AccessDeniedException')
      if (msg instanceof RegExp) {
        should(body.Message).match(msg)
      }
      else {
        should(body.Message).equal(msg)
      }
      done()
    })
  }

  function assertValidation (target: string, data: unknown, msg: LegacyValidationMessage, done: HelperCallback): void {
    request(opts(target, data), function (err: unknown, res?: HelperHttpResponse): void {
      if (err) return done(err)
      if (res == null || res.statusCode == null) return done(new Error('Missing response statusCode'))
      var body = getJsonBody(res)
      if (body == null) return done(new Error('Not JSON: ' + res.body))
      should(body.__type).equal('com.amazon.coral.validate#ValidationException')
      if (msg instanceof RegExp) {
        should(body.message).match(msg)
      }
      else if (Array.isArray(msg)) {
        var prefix = msg.length + ' validation error' + (msg.length === 1 ? '' : 's') + ' detected: '
        if (typeof body.message !== 'string') return done(new Error('Validation body missing message'))
        should(body.message).startWith(prefix)
        var errors = body.message.slice(prefix.length).split('; ')
        for (var i = 0; i < msg.length; i++) {
          should(errors).matchAny(msg[i])
        }
      }
      else {
        should(body.message).equal(msg)
      }
      should(res.statusCode).equal(400)
      done()
    })
  }

  function assertNotFound (target: string, data: unknown, msg: string, done: HelperCallback): void {
    request(opts(target, data), function (err: unknown, res?: HelperHttpResponse): void {
      if (err) return done(err)
      if (res == null || res.statusCode == null) return done(new Error('Missing response statusCode'))
      should(res.statusCode).equal(400)
      should(res.body).eql({
        __type: 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException',
        message: msg,
      })
      done()
    })
  }

  function assertInUse (target: string, data: unknown, msg: string, done: HelperCallback): void {
    request(opts(target, data), function (err: unknown, res?: HelperHttpResponse): void {
      if (err) return done(err)
      if (res == null || res.statusCode == null) return done(new Error('Missing response statusCode'))
      should(res.statusCode).equal(400)
      should(res.body).eql({
        __type: 'com.amazonaws.dynamodb.v20120810#ResourceInUseException',
        message: msg,
      })
      done()
    })
  }

  function assertConditional (target: string, data: unknown, done: HelperCallback): void {
    request(opts(target, data), function (err: unknown, res?: HelperHttpResponse): void {
      if (err) return done(err)
      if (res == null || res.statusCode == null) return done(new Error('Missing response statusCode'))
      should(res.statusCode).equal(400)
      should(res.body).eql({
        __type: 'com.amazonaws.dynamodb.v20120810#ConditionalCheckFailedException',
        message: 'The conditional request failed',
      })
      done()
    })
  }

  return {
    assertType: assertType,
    assertAccessDenied: assertAccessDenied,
    assertValidation: assertValidation,
    assertNotFound: assertNotFound,
    assertInUse: assertInUse,
    assertConditional: assertConditional,
  }
}

function getSubtypeName (subtype?: string): string {
  if (subtype == null) throw new Error('Missing subtype in type assertion')
  return subtype
}

function getMapSubtypeName (subtype?: string): string {
  var subtypeName = getSubtypeName(subtype)
  return ~subtypeName.indexOf('.') ? subtypeName : 'com.amazonaws.dynamodb.v20120810.' + subtypeName
}

function createNestedSerializationPayload (pieces: string[], value: LegacySerializationTestValue): { [key: string]: LegacySerializationTestValue } {
  var data: { [key: string]: LegacySerializationTestValue } = {}
  var child: LegacySerializationContainer = data
  var i: number
  for (i = 0; i < pieces.length - 1; i++) {
    child = assignNestedContainer(child, pieces[i], createNextContainer(pieces[i + 1]))
  }
  assignNestedValue(child, pieces[pieces.length - 1], value)
  return data
}

function createNextContainer (nextPiece: string): LegacySerializationContainer {
  return nextPiece === '0' ? [] : {}
}

function assignNestedContainer (container: LegacySerializationContainer, piece: string, nextContainer: LegacySerializationContainer): LegacySerializationContainer {
  if (Array.isArray(container)) {
    container[0] = nextContainer
    return nextContainer
  }
  container[piece] = nextContainer
  return nextContainer
}

function assignNestedValue (container: LegacySerializationContainer, piece: string, value: LegacySerializationTestValue): void {
  if (Array.isArray(container)) {
    container[0] = value
    return
  }
  container[piece] = value
}

function getJsonBody (res?: HelperHttpResponse): HelperJsonBody | undefined {
  if (res == null || typeof res.body === 'string') return
  return res.body
}

module.exports = {
  createLegacyAssertions: createLegacyAssertions,
}
