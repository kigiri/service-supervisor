const netcall = require('netcall')

const cache = Object.create(null)

const get = async name => {
  netcall[name] || (await netcall.init([ name ]))
  const service = netcall[name]
  const c = cache[name] || (cache[name] = {
    fn: () => (netcall.kill(name), netcall[name] = undefined)
  })
  clearTimeout(c.timeout)
  c.timeout = setTimeout(c.fn, 60000)
  return service
}

module.exports = {
  get: async ({ name }) => Object.keys(await get(name)),
  exec: async ({ name, method, params }) =>
    (await get(name))[method](JSON.parse(params)),
}
