#!/usr/bin/env node

// Adds `var should = require('should')` to a file when it already uses
// `should(...)` assertions but does not yet import the runtime.
// This is intended as a narrow per-file migration helper for converted tests.
// It makes no change if the file already requires `should`.
// The script is idempotent and supports `--check` / `--dry-run`.

var fs = require('fs')
var path = require('path')

var cwd = process.cwd()
var args = process.argv.slice(2)
var write = true

args = args.filter(function (arg) {
  if (arg == '--check' || arg == '--dry-run') {
    write = false
    return false
  }
  return true
})

if (!args.length) {
  console.error('usage: node scripts/ensure-should-require.js [--check] <file> [...]')
  process.exit(1)
}

args.forEach(function (target) {
  var file = path.resolve(cwd, target)
  var source = fs.readFileSync(file, 'utf8')
  if (!/\bshould\s*\(/.test(source)) return
  if (/require\(['"]should['"]\)/.test(source)) return

  var output = "var should = require('should')\n" + source
  if (write)
    fs.writeFileSync(file, output)

  console.log('%s %s', write ? 'updated' : 'would update', path.relative(cwd, file))
})
