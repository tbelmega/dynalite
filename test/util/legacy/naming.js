function createLegacyNaming (options) {
  options = options || {}
  var prefix = options.prefix || ''

  function randomString () {
    return ('AAAAAAAAA' + randomNumber()).slice(-10)
  }

  function randomNumber () {
    return String(Math.random() * 0x100000000)
  }

  function randomName () {
    return prefix + randomString()
  }

  function strDecrement (str, regex, length) {
    regex = regex || /.?/
    length = length || 255
    var lastIx = str.length - 1, lastChar = str.charCodeAt(lastIx) - 1, strPrefix = str.slice(0, lastIx), finalChar = 255
    while (lastChar >= 0 && !regex.test(String.fromCharCode(lastChar))) lastChar--
    if (lastChar < 0) return strPrefix
    strPrefix += String.fromCharCode(lastChar)
    while (finalChar >= 0 && !regex.test(String.fromCharCode(finalChar))) finalChar--
    if (lastChar < 0) return strPrefix
    while (strPrefix.length < length) strPrefix += String.fromCharCode(finalChar)
    return strPrefix
  }

  return {
    randomString: randomString,
    randomNumber: randomNumber,
    randomName: randomName,
    strDecrement: strDecrement,
  }
}

module.exports = {
  createLegacyNaming: createLegacyNaming,
}
