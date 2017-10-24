const fs = require('fs')

export const extractFileNameParts = function (path) {
  return path.substring(path.lastIndexOf('/') + 1).split('.')
}

export const cleanFileName = function (fileName) {
  // Replace all spaces with underscores and delete all other non-alphanumeric characters
  return fileName.replace(/\s+/ig, '_').replace(/[^A-Z0-9_.]/ig, '')
}

export const getFilesizeInBytes = function (filename) {
  const stats = fs.statSync(filename)
  const fileSizeInBytes = stats.size
  return fileSizeInBytes
}

export const rangePattern = n => Array.from({length: n}, (value, key) => ('000' + key).slice(-3))
