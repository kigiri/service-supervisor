const { child_process: { exec } } = require('4k')
const services = require('./services')
const addProxy = require('./add-proxy')

;(async () => {
  console.log('adding service and nginx proxy...')
  await Promise.all([
    addProxy({ name: 'supervisor' })
      .then(() => console.log('nginx proxy added')),

    services.add({ name: 'supervisor' })
      .then(() => console.log('service enabled')),
  ])
  const { stdout } = await exec(`node -e `
    +`"console.log(JSON.stringify(Object.keys(process.env)))"`)
  const blacklist = new Set(JSON.parse(stdout))
  const env = JSON.stringify(Object.keys(process.env)
    .filter(key => !blacklist.has(key))
    .reduce((acc, key) => (acc[key] = process.env[key], acc), {}))
  console.log('adding env...')
  await services.updateEnv({ name: 'supervisor', env })
  console.log('env added')
  console.log('restarting service')
  return services.restart({ name: 'supervisor' })
})().catch(console.error)
