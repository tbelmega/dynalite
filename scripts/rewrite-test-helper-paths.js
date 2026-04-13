#!/usr/bin/env node

// Rewrites test helper imports to the emitted-location-safe path used by
// compiled tests under `dist/test/`.
// This is intended as a narrow per-file migration helper for converted tests,
// so the runtime `require(...)` continues to resolve after TS emit.
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
  console.error('usage: node scripts/rewrite-test-helper-paths.js [--check] <file> [...]')
  process.exit(1)
}

args.forEach(function (target) {
  var file = path.resolve(cwd, target)
  var source = fs.readFileSync(file, 'utf8')
  var output = source
    .replace(/require\((['"])\/?\.\/helpers\1\)/g, "require('../../test/helpers')")
    .replace(/require\((['"])\.\.\/test\/helpers\1\)/g, "require('../../test/helpers')")

  if (output == source) return
  if (write)
    fs.writeFileSync(file, output)

  console.log('%s %s', write ? 'updated' : 'would update', path.relative(cwd, file))
})
