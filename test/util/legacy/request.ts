var http = require('http')
var aws4 = require('aws4')
var once = require('once')
var should = require('should')
import type {
  HelperCallback,
  HelperHttpResponse,
  HelperResponseBody,
  HelperResponseCallback,
  InstanceRequestOptions,
  LegacyRequestApi,
  LegacyRequestApiDeps,
} from '../../../types/types';

function buildTargetOpts (version: string, target: string, data: unknown): InstanceRequestOptions {
  return {
    headers: {
      'Content-Type': 'application/x-amz-json-1.0',
      'X-Amz-Target': version + '.' + target,
    },
    body: JSON.stringify(data),
  }
}

function createLegacyRequestApi (deps: LegacyRequestApiDeps): LegacyRequestApi {
  var startGlobalServer = deps.startGlobalServer
  var requestOpts = deps.requestOpts
  var useRemoteDynamo = deps.useRemoteDynamo
  var version = deps.version
  var maxRetries = deps.maxRetries

  function opts (target: string, data: unknown): InstanceRequestOptions {
    return buildTargetOpts(version, target, data)
  }

  // Legacy request function used by the old helpers exported from `test/helpers.js`.
  function request (reqOpts: InstanceRequestOptions | HelperResponseCallback, cb?: HelperResponseCallback): void {
    var requestOptions: InstanceRequestOptions
    var callback: HelperResponseCallback | undefined

    if (typeof reqOpts === 'function') {
      callback = reqOpts
      requestOptions = {}
    }
    else {
      requestOptions = reqOpts
      callback = cb
    }
    if (callback == null) throw new Error('Missing request callback')
    var requestCallback: HelperResponseCallback = callback

    // Ensure global server is started for legacy tests.
    startGlobalServer(function (err: unknown): void {
      if (err) return requestCallback(err)

      requestOptions.retries = requestOptions.retries ?? 0
      var safeCallback: HelperResponseCallback = once(function (callbackErr?: unknown, res?: HelperHttpResponse): void {
        requestCallback(callbackErr, res)
      })

      if (requestOptions.host == null) requestOptions.host = requestOpts.host
      if (requestOptions.method == null) requestOptions.method = requestOpts.method
      if (requestOptions.port == null && requestOpts.port != null) requestOptions.port = requestOpts.port

      if (!requestOptions.noSign) {
        aws4.sign(requestOptions)
        requestOptions.noSign = true
      }

      http.request(requestOptions, function (res: HelperHttpResponse): void {
        res.setEncoding('utf8')
        res.on('error', safeCallback)
        res.rawBody = ''
        res.on('data', function (chunk: string): void { res.rawBody += chunk })
        res.on('end', function (): void {
          try {
            res.body = JSON.parse(res.rawBody) as HelperResponseBody
          }
          catch {
            res.body = res.rawBody
          }

          if (useRemoteDynamo && (requestOptions.retries ?? 0) <= maxRetries && isRetryableDynamoBody(res.body)) {
            requestOptions.retries = (requestOptions.retries ?? 0) + 1
            setTimeout(request, Math.floor(Math.random() * 1000), requestOptions, safeCallback)
            return
          }

          safeCallback(null, res)
        })
      }).on('error', function (requestErr: unknown): void {
        if (isRetryableNetworkError(requestErr) && (requestOptions.retries ?? 0) <= maxRetries) {
          requestOptions.retries = (requestOptions.retries ?? 0) + 1
          setTimeout(request, Math.floor(Math.random() * 100), requestOptions, safeCallback)
          return
        }
        safeCallback(requestErr)
      }).end(requestOptions.body)
    })
  }

  function assertSerialization (target: string, data: unknown, msg: string, done: HelperCallback): void {
    request(opts(target, data), function (err: unknown, res?: HelperHttpResponse): void {
      if (err) return done(err)
      if (res == null || res.statusCode == null) return done(new Error('Missing response statusCode'))
      should(res.statusCode).equal(400)
      should(res.body).eql({
        __type: 'com.amazon.coral.service#SerializationException',
        Message: msg,
      })
      done()
    })
  }

  return {
    request: request,
    opts: opts,
    assertSerialization: assertSerialization,
  }
}

function isRetryableDynamoBody (body: HelperResponseBody): boolean {
  return typeof body !== 'string' &&
    (body.__type == 'com.amazon.coral.availability#ThrottlingException' ||
    body.__type == 'com.amazonaws.dynamodb.v20120810#LimitExceededException')
}

function isRetryableNetworkError (err: unknown): err is NodeJS.ErrnoException {
  return typeof err === 'object' && err != null && 'code' in err &&
    typeof err.code === 'string' &&
    [ 'ECONNRESET', 'EMFILE', 'ENOTFOUND' ].indexOf(err.code) !== -1
}

module.exports = {
  buildTargetOpts: buildTargetOpts,
  createLegacyRequestApi: createLegacyRequestApi,
}
