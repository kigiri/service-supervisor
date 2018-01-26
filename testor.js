const netcall = require('netcall')

const get = async name => {
  const service = (netcall || (await netcall.init([ name ])))[name]
  clearTimeout(cache[name].timeout)
  cache[name].timeout = setTimeout(cache[name].fn || (cache[name]
    .fn = () => (netcall.kill(name), netcall[name] = undefined)), 9999)
  return service
}

module.exports = {
  get: async ({ name }) => Object.keys(await get(name)),
  exec: async ({ name, method, params }) =>
    (await get(name))[method](JSON.parse(params)),
}
