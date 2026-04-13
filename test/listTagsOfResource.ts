var should = require('should')
var helpers = require('../../test/helpers')

import type {
  ListTagsOfResourceResponse,
  ResourceTag,
  TestDynamoRequest,
} from '../types/types'

var target = 'ListTagsOfResource',
  request: (requestOptions: TestDynamoRequest, cb: (err: unknown, res: ListTagsOfResourceResponse) => void) => void = helpers.request,
  opts: (data: TestDynamoRequest) => Record<string, unknown> = helpers.opts.bind(null, target),
  assertType = helpers.assertType.bind(null, target),
  assertAccessDenied = helpers.assertAccessDenied.bind(null, target),
  assertNotFound = helpers.assertNotFound.bind(null, target),
  assertValidation = helpers.assertValidation.bind(null, target)

describe('listTagsOfResource', function () {

  describe('serializations', function () {

    it('should return SerializationException when ResourceArn is not a string', function (done) {
      assertType('ResourceArn', 'String', done)
    })

  })

  describe('validations', function () {

    it('should return ValidationException for no ResourceArn', function (done) {
      assertValidation({}, 'Invalid TableArn', done)
    })

    it('should return AccessDeniedException for empty ResourceArn', function (done) {
      assertAccessDenied({ ResourceArn: '' },
        /^User: arn:aws:iam::\d+:.+ is not authorized to perform: dynamodb:ListTagsOfResource on resource: \*$/,
        done)
    })

    it('should return AccessDeniedException for unauthorized ResourceArn', function (done) {
      assertAccessDenied({ ResourceArn: 'abcd' },
        /^User: arn:aws:iam::\d+:.+ is not authorized to perform: dynamodb:ListTagsOfResource on resource: abcd$/,
        done)
    })

    it('should return AccessDeniedException for no ResourceArn', function (done) {
      assertAccessDenied({ ResourceArn: 'a:b:c:d:e:f' },
        /^User: arn:aws:iam::\d+:.+ is not authorized to perform: dynamodb:ListTagsOfResource on resource: a:b:c:d:e:f$/,
        done)
    })

    it('should return AccessDeniedException for no ResourceArn', function (done) {
      assertAccessDenied({ ResourceArn: 'a:b:c:d:e/f' },
        /^User: arn:aws:iam::\d+:.+ is not authorized to perform: dynamodb:ListTagsOfResource on resource: a:b:c:d:e\/f$/,
        done)
    })

    it('should return ValidationException for no ResourceArn', function (done) {
      assertValidation({ ResourceArn: 'a:b:c:d:e:f/g' },
        'Invalid TableArn: Invalid ResourceArn provided as input a:b:c:d:e:f/g', done)
    })

    it('should return ValidationException for short table name', function (done) {
      var resourceArn = 'arn:aws:dynamodb:' + helpers.awsRegion + ':' + helpers.awsAccountId + ':table/ab'
      assertValidation({ ResourceArn: resourceArn },
        'Invalid TableArn: Invalid ResourceArn provided as input ' + resourceArn, done)
    })

    it('should return ResourceNotFoundException if ResourceArn does not exist', function (done) {
      var resourceArn = 'arn:aws:dynamodb:' + helpers.awsRegion + ':' + helpers.awsAccountId + ':table/' + helpers.randomString()
      assertNotFound({ ResourceArn: resourceArn },
        'Requested resource not found: ResourcArn: ' + resourceArn + ' not found', done)
    })

  })

  describe('functionality', function () {

    it('should succeed if valid resource and has no tags', function (done) {
      var resourceArn = 'arn:aws:dynamodb:' + helpers.awsRegion + ':' + helpers.awsAccountId + ':table/' + helpers.testHashTable

      request(opts({ ResourceArn: resourceArn }), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        should(res.body).eql({ Tags: [] })
        done()
      })
    })

    it('should succeed if valid resource and has multiple tags', function (done) {
      var resourceArn = 'arn:aws:dynamodb:' + helpers.awsRegion + ':' + helpers.awsAccountId + ':table/' + helpers.testHashTable

      request(opts({ ResourceArn: resourceArn }), function (err, res) {
        if (err) return done(err)
        should(res.statusCode).equal(200)
        should(res.body).eql({ Tags: [] })

        var tags: ResourceTag[] = [ { Key: 't1', Value: 'v1' }, { Key: 't2', Value: 'v2' } ]

        request(helpers.opts('TagResource', { ResourceArn: resourceArn, Tags: tags }), function (err, res) {
          if (err) return done(err)
          should(res.statusCode).equal(200)

          request(opts({ ResourceArn: resourceArn }), function (err, res) {
            if (err) return done(err)
            should(res.statusCode).equal(200)
            should(res.body.Tags).not.be.null()
            should(res.body.Tags.length).equal(tags.length)
            res.body.Tags.forEach(function (tag: ResourceTag) { should(tags).containEql(tag) })

            var tagKeys = tags.map(function (tag) { return tag.Key })

            request(helpers.opts('UntagResource', { ResourceArn: resourceArn, TagKeys: tagKeys }), function (err, res) {
              if (err) return done(err)
              should(res.statusCode).equal(200)

              request(opts({ ResourceArn: resourceArn }), function (err, res) {
                if (err) return done(err)
                should(res.statusCode).equal(200)
                should(res.body).eql({ Tags: [] })

                done()
              })
            })
          })
        })
      })
    })

  })

})
