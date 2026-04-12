# dynalite

Personal fork maintained by Thiemo Belmega.
Originally created by [Michael Hart](https://github.com/mhart) and later maintained by the
[Architect team](https://github.com/architect/dynalite).

This fork is based on the upstream project at [architect/dynalite](https://github.com/architect/dynalite)
and retains upstream attribution under the Apache 2.0 license.

An implementation of Amazon's DynamoDB built on LevelDB
(well, [@rvagg](https://github.com/rvagg)'s awesome [LevelUP](https://github.com/Level/levelup) to be precise)
for fast in-memory or persistent usage.

This project aims to match the live DynamoDB instances as closely as possible
(and is tested against them in various regions), including all limits and error messages.

## Example

```sh
$ dynalite --help

Usage: dynalite [--port <port>] [--path <path>] [options]

A DynamoDB http server, optionally backed by LevelDB

Options:
--help, -h            Display this help message and exit
--host                Listen on a specific host address (default: all available)
--port <port>         The port to listen on (default: 4567)
--path <path>         The path to use for the LevelDB store (in-memory by default)
--ssl                 Enable SSL for the web server (default: false)
--createTableMs <ms>  Amount of time tables stay in CREATING state (default: 500)
--deleteTableMs <ms>  Amount of time tables stay in DELETING state (default: 500)
--updateTableMs <ms>  Amount of time tables stay in UPDATING state (default: 500)
--maxItemSizeKb <kb>  Maximum item size (default: 400)
--verbose, -v         Enable verbose logging
--debug, -d           Enable debug logging

Report bugs at github.com/tbelmega/dynalite/issues
```

Or programmatically:

```js
// Returns a standard Node.js HTTP server
var dynalite = require('@tbelmega/dynalite')
var dynaliteServer = dynalite({ path: './mydb', createTableMs: 50 })

// Listen on port 4567
dynaliteServer.listen(4567, function(err) {
  if (err) throw err
  console.log('Dynalite started on port 4567')
})
```

Once running, here's how you use the [AWS SDK](https://github.com/aws/aws-sdk-js) to connect
(after [configuring the SDK](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/configuring-the-jssdk.html)):

```js
var AWS = require('aws-sdk')

var dynamo = new AWS.DynamoDB({ endpoint: 'http://localhost:4567' })

dynamo.listTables(console.log.bind(console))
```

## Installation

With [npm](https://www.npmjs.com/), to install this fork's CLI:

```sh
npm install -g @tbelmega/dynalite
```

Or to install this fork for development/testing in your project:

```sh
npm install -D @tbelmega/dynalite
```

## Development

For local development in this fork, prefer [Bun](https://bun.sh/) for dependency management and script execution:

```sh
bun install
bun run build
bun run test
```

The existing `package.json` scripts are unchanged, so npm remains available if you need it:

```sh
npm install
npm run build
npm test
```

## TODO

- Implement [Transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html)
- Implement DynamoDB Streams
- Implement `ReturnItemCollectionMetrics` on all remaining endpoints
- Implement size info for tables and indexes
- Add ProvisionedThroughput checking
