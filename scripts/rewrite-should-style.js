#!/usr/bin/env node

// Rewrites assertion chains from `value.should...` to `should(value)...`.
// This is intended as a narrow per-file migration helper for test conversion work.
// Run it on a single test file after renaming to `.ts` so TypeScript-visible
// assertions use the style that does not rely on `should` prototype augmentation.
// The script is idempotent and supports `--check` / `--dry-run`.

var fs = require('fs')
var path = require('path')

var cwd = process.cwd()
var args = process.argv.slice(2)
var write = true
var targets = []

args.forEach(function (arg) {
  if (arg == '--check' || arg == '--dry-run') {
    write = false
    return
  }
  targets.push(arg)
})

if (!targets.length) targets = [ 'test' ]

var files = collectFiles(targets)
var totalFilesChanged = 0
var totalReplacements = 0

files.forEach(function (file) {
  var result = rewriteFile(file)
  if (!result.changed) return

  totalFilesChanged++
  totalReplacements += result.replacements

  if (write)
    fs.writeFileSync(file, result.output)

  console.log('%s %s (%d replacements)', write ? 'updated' : 'would update', path.relative(cwd, file), result.replacements)
})

console.log('processed %d files, %d changed, %d replacements', files.length, totalFilesChanged, totalReplacements)

function collectFiles (inputTargets) {
  var results = []

  inputTargets.forEach(function (target) {
    var resolved = path.resolve(cwd, target)
    if (!fs.existsSync(resolved)) return

    var stat = fs.statSync(resolved)
    if (stat.isDirectory()) {
      walk(resolved, results)
      return
    }

    if (isTestFile(resolved))
      results.push(resolved)
  })

  return results.sort()
}

function walk (dir, results) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    var fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, results)
      return
    }

    if (isTestFile(fullPath))
      results.push(fullPath)
  })
}

function isTestFile (file) {
  return /\.(js|ts)$/.test(file)
}

function rewriteFile (file) {
  var source = fs.readFileSync(file, 'utf8')
  var replacements = []
  var index = source.indexOf('.should')

  while (index != -1) {
    var exprStart = findExpressionStart(source, index)
    if (exprStart != -1) {
      replacements.push({
        start: exprStart,
        end: index + '.should'.length,
        text: 'should(' + source.slice(exprStart, index) + ')',
      })
    }
    index = source.indexOf('.should', index + '.should'.length)
  }

  if (!replacements.length)
    return { changed: false, output: source, replacements: 0 }

  replacements.sort(function (a, b) {
    return b.start - a.start
  })

  var output = source
  replacements.forEach(function (replacement) {
    output = output.slice(0, replacement.start) + replacement.text + output.slice(replacement.end)
  })

  return {
    changed: output != source,
    output: output,
    replacements: replacements.length,
  }
}

function findExpressionStart (source, shouldIndex) {
  var parenDepth = 0
  var bracketDepth = 0
  var braceDepth = 0
  var i

  for (i = shouldIndex - 1; i >= 0; i--) {
    var char = source[i]

    if (char == ')') {
      parenDepth++
      continue
    }
    if (char == ']') {
      bracketDepth++
      continue
    }
    if (char == '}') {
      braceDepth++
      continue
    }

    if (char == '(') {
      if (parenDepth > 0) {
        parenDepth--
        continue
      }
      break
    }
    if (char == '[') {
      if (bracketDepth > 0) {
        bracketDepth--
        continue
      }
      break
    }
    if (char == '{') {
      if (braceDepth > 0) {
        braceDepth--
        continue
      }
      break
    }

    if (parenDepth || bracketDepth || braceDepth)
      continue

    if (/\s/.test(char))
      continue

    if (/[$\w.]/.test(char))
      continue

    break
  }

  return i + 1
}
