var http = require('http')
var aws4 = require('aws4')
var once = require('once')
var dynalite = require('../../../..')
import type {
  HelperHttpResponse,
  HelperResponseBody,
  HelperResponseCallback,
  InstanceRequestOptions,
  InstanceTestHelper,
} from '../../../types/types';

function attachInstanceRequest (helper: InstanceTestHelper): void {
  helper.startServer = function (): Promise<void> {
    return new Promise<void>(function (resolve, reject) {
      if (helper.useRemoteDynamo) {
        helper.createTestTables(function (err: unknown): void {
          if (err) return reject(err)
          helper.getAccountId(function (accountErr: unknown): void {
            if (accountErr) return reject(accountErr)
            resolve()
          })
        })
        return
      }

      var server = dynalite({ path: process.env.DYNALITE_PATH })
      helper.server = server
      server.listen(helper.port, function (err: unknown): void {
        if (err) return reject(err)
        helper.createTestTables(function (err: unknown): void {
          if (err) return reject(err)
          helper.getAccountId(function (accountErr: unknown): void {
            if (accountErr) return reject(accountErr)
            resolve()
          })
        })
      })
    })
  }

  helper.stopServer = function (): Promise<void> {
    return new Promise<void>(function (resolve, reject) {
      helper.deleteTestTables(function (err: unknown): void {
        if (err) return reject(err)
        if (helper.server) {
          helper.server.close(function (): void {
            resolve()
          })
        }
        else {
          resolve()
        }
      })
    })
  }

  helper.request = function (opts: InstanceRequestOptions | HelperResponseCallback, cb?: HelperResponseCallback): void {
    var requestOptions: InstanceRequestOptions
    var callback: HelperResponseCallback | undefined

    if (typeof opts === 'function') {
      callback = opts
      requestOptions = {}
    }
    else {
      requestOptions = opts
      callback = cb
    }

    if (callback == null) throw new Error('Missing request callback')
    var requestCallback: HelperResponseCallback = callback

    requestOptions.retries = requestOptions.retries ?? 0
    var safeCallback: HelperResponseCallback = once(function (err?: unknown, res?: HelperHttpResponse): void {
      requestCallback(err, res)
    })
    if (requestOptions.host == null) requestOptions.host = helper.requestOpts.host
    if (requestOptions.method == null) requestOptions.method = helper.requestOpts.method
    if (requestOptions.port == null && helper.requestOpts.port != null) requestOptions.port = helper.requestOpts.port
    if (!requestOptions.noSign) {
      aws4.sign(requestOptions)
      requestOptions.noSign = true
    }

    var MAX_RETRIES = 20
    http.request(requestOptions, function (res: HelperHttpResponse) {
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
        if (helper.useRemoteDynamo && (requestOptions.retries ?? 0) <= MAX_RETRIES &&
            isRetryableDynamoBody(res.body)) {
          requestOptions.retries = (requestOptions.retries ?? 0) + 1
          setTimeout(helper.request, Math.floor(Math.random() * 1000), requestOptions, safeCallback)
          return
        }
        safeCallback(null, res)
      })
    }).on('error', function (err: unknown): void {
      if (isRetryableNetworkError(err) && (requestOptions.retries ?? 0) <= MAX_RETRIES) {
        requestOptions.retries = (requestOptions.retries ?? 0) + 1
        setTimeout(helper.request, Math.floor(Math.random() * 100), requestOptions, safeCallback)
        return
      }
      safeCallback(err)
    }).end(requestOptions.body)
  }

  helper.opts = function (target: string, data: unknown): InstanceRequestOptions {
    return {
      headers: {
        'Content-Type': 'application/x-amz-json-1.0',
        'X-Amz-Target': helper.version + '.' + target,
      },
      body: JSON.stringify(data),
    }
  }
}

function isRetryableDynamoBody (body: HelperResponseBody): boolean {
  if (typeof body === 'string') return false
  return body.__type == 'com.amazon.coral.availability#ThrottlingException' ||
    body.__type == 'com.amazonaws.dynamodb.v20120810#LimitExceededException'
}

function isRetryableNetworkError (err: unknown): err is NodeJS.ErrnoException {
  return typeof err === 'object' && err != null && 'code' in err &&
    typeof err.code === 'string' &&
    [ 'ECONNRESET', 'EMFILE', 'ENOTFOUND' ].indexOf(err.code) !== -1
}

module.exports = {
  attachInstanceRequest: attachInstanceRequest,
}
