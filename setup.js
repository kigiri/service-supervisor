const { child_process: { exec } } = require('4k')
const services = require('./services')
const addProxy = require('./add-proxy')

;(async () => {
  console.log('adding service and nginx proxy...')
  await Promise.all([
    addProxy({ name: 'supervisor.oct.ovh', port: process.env.PORT })
      .then(() => console.log('nginx proxy added')),

    services.add({ name: 'supervisor' })
      .then(() => console.log('service enabled')),
  ])
})().catch(console.error)
