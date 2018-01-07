'use strict'

const { createServer } = require('http')
const { c } = require('4k')
const server4k = require('4k/server')
const { required } = require('4k/route-helper')
const scaleway = require('./scaleway')
const addProxy = require('./add-proxy')
const addService = require('./add-service')
const loadSevices = require('./load-services')
const saveEnv = require('./save-env')
const github = require('./github')
const { DOMAIN, PORT } = process.env
const db = require('./redis')

createServer(server4k({
  routes: {
    OAUTH: { github: github.oauth },
    POST: {
      '/env': {
        description: 'update service environement',
        params: {
          serviceName: required(String),
          env: required(src => Buffer(src, 'base64')),
        },
        handler: saveEnv,
      }
    },
    GET: {
      '/services': {
        description: 'get service list',
        handler: loadSevices,
      },
    },
  },
  domain: `https://supervisor.${DOMAIN}`,
  allowOrigin: `https://kigiri.github.io`,
  session: {
    options: { domain: `supervisor.${DOMAIN}`, path: '/' },
    get: required(c([
      key => `supervisor-sessions:${key}`,
      db.get,
      user => db.hget('supervisor-users', user),
      JSON.parse,
      user => {
        if (user.id === 'MDQ6VXNlcjIzMTc0OA==') return user
        throw Error(`Unknow Git User ${user.login}`)
      },
    ])),
  },
})).listen(PORT, () =>
  console.info(`server started: http://localhost:${PORT}`))

module.exports = (async () => {
  const servers = (await scaleway.get.servers())
    .servers.reduce((a, s) => (a[s.id] = s, a), Object.create(null))

  const services = await loadSevices()
  console.log(services)
})()
