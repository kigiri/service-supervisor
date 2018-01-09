const { fs: { readFile, readdir, lstat } } = require('4k')
const { join: joinPath } = require('path')
const read = path => readFile(path, 'utf8')

const getTree = async rootDir => (await Promise.all((await readdir(rootDir))
  .filter(file => !file.startsWith('.') && !file.startsWith('node_modules'))
  .map(async file => {
    const path = joinPath(rootDir, file)
    return ((await lstat(path)).isDirectory()) ? getTree(path) : path
  }))).reduce((prev, next) => Array.isArray(next)
    ? prev.concat(next)
    : (prev.push(next), prev), [])
    .filter(file => file.endsWith('.js'))

  // TODO: Consolidate the environement variable detection
  // /\bprocess\.env\[([^]]+)\]/
  // /(const|let)\s+\{([^}]+)\}\s+=\s+/
  // And maybe not concatenate all the files but do it in a more optimised way
module.exports = async rootDir => (await Promise.all((await getTree(rootDir))
    .map(read)))
  .join('\n')
  .split(/\bprocess\.env\.([A-Za-z0-9$_]+)/g)
  .filter((_,i) => i % 2)
  .reduce((acc, key) => (acc[key] = process.env[key] || '', acc), {})
