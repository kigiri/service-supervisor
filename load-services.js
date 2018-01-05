const { fs: { readdir, readFile } } = require('4k')
const readJSON = async path => JSON.parse(await readFile(path, 'utf8'))
const env = {}
const returnEmpty = () => ({})
const returnEnv = () => env
const aggregateServices = (acc, [ pkg, env, name ]) => {
  acc[name] = { ...pkg, env, name }
  return acc
}

const getServiceInfo = name => Promise.all([
  readJSON(`/service/${name}/package.json`),
  readJSON(`/service/${name}-env.json`).catch(returnEmpty),
  name,
])

const notJSON = name => !/\.json$/.test(name)

module.exports = async () => (await Promise.all((await readdir('/service'))
  .filter(notJSON)
  .map(getServiceInfo)))
  .reduce(aggregateServices, {})
