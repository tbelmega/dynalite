#!/usr/bin/env node

// Adds first-pass TypeScript types for common test helper bindings.
// This is intended as a narrow per-file migration helper for converted tests.
// It annotates `request`, `opts`, and `assertConditional` when they still use
// untyped `helpers.*` bindings, and adds the matching shared type imports.
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
  console.error('usage: node scripts/add-test-helper-types.js [--check] <file> [...]')
  process.exit(1)
}

args.forEach(function (target) {
  var file = path.resolve(cwd, target)
  var source = fs.readFileSync(file, 'utf8')
  var result = rewriteFile(source)

  if (!result.changed) return
  if (write)
    fs.writeFileSync(file, result.output)

  console.log('%s %s', write ? 'updated' : 'would update', path.relative(cwd, file))
})

function rewriteFile (source) {
  var output = source
  var neededImports = []

  output = annotateBinding(
    output,
    /(\n\s*request)(\s*=\s*helpers\.request,)/,
    ': (requestOptions: TestDynamoRequest, cb: (err: unknown, res: TestDynamoResponse) => void) => void',
    [ 'TestDynamoRequest', 'TestDynamoResponse' ],
  )

  if (output.changed) {
    neededImports = neededImports.concat(output.imports)
    output = output.text
  }
  else {
    output = output.text
  }

  var optsOutput = annotateBinding(
    output,
    /(\n\s*opts)(\s*=\s*helpers\.opts\.bind\(null,\s*target\),)/,
    ': (data: TestDynamoRequest) => Record<string, unknown>',
    [ 'TestDynamoRequest' ],
  )
  if (optsOutput.changed) {
    neededImports = neededImports.concat(optsOutput.imports)
    output = optsOutput.text
  }
  else {
    output = optsOutput.text
  }

  var conditionalOutput = annotateBinding(
    output,
    /(\n\s*assertConditional)(\s*=\s*helpers\.assertConditional\.bind\(null,\s*target\))/,
    ': (data: TestDynamoRequest, done: AsyncCallback) => void',
    [ 'AsyncCallback', 'TestDynamoRequest' ],
  )
  if (conditionalOutput.changed) {
    neededImports = neededImports.concat(conditionalOutput.imports)
    output = conditionalOutput.text
  }
  else {
    output = conditionalOutput.text
  }

  neededImports = unique(neededImports)
  if (neededImports.length)
    output = ensureTypesImport(output, neededImports)

  return { changed: output != source, output: output }
}

function annotateBinding (source, pattern, typeAnnotation, imports) {
  if (!pattern.test(source))
    return { changed: false, text: source, imports: [] }

  return {
    changed: true,
    text: source.replace(pattern, '$1' + typeAnnotation + '$2'),
    imports: imports,
  }
}

function ensureTypesImport (source, imports) {
  var importPattern = /import type\s*\{([\s\S]*?)\}\s*from\s*['"]\.\.\/types\/types['"]/
  var match = source.match(importPattern)

  if (match) {
    var existing = match[1]
      .split(',')
      .map(function (name) { return name.trim() })
      .filter(Boolean)

    var merged = unique(existing.concat(imports)).sort()
    var replacement = "import type {\n  " + merged.join(',\n  ') + ",\n} from '../types/types'"
    return source.replace(importPattern, replacement)
  }

  var targetIndex = source.indexOf('\nvar target =')
  if (targetIndex == -1) return source

  var block = "import type {\n  " + unique(imports).sort().join(',\n  ') + ",\n} from '../types/types'\n\n"
  return source.slice(0, targetIndex + 1) + block + source.slice(targetIndex + 1)
}

function unique (values) {
  return values.filter(function (value, index) {
    return values.indexOf(value) == index
  })
}
