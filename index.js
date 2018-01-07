'use strict'

const { createServer } = require('http')
const { c } = require('4k')
const server4k = require('4k/server')
const { required } = require('4k/route-helper')
const scaleway = require('./scaleway')
const addProxy = require('./add-proxy')
const addService = require('./add-service')
const loadSevices = require('./load-services')
const github = require('./github')
const { DOMAIN, PORT } = process.env
const db = require('./redis')

createServer(server4k({
  routes: {
    OAUTH: { github: github.oauth },
    GET: {
      '/session': {
        description: 'log user data',
        handler: ({ session }) => session,
      },
    },
  },
  domain: `https://supervisor.${DOMAIN}`,
  allowOrigin: `https://kigiri.github.io/supervisor`,
  session: {
    options: { domain: `supervisor.${DOMAIN}`, path: '/' },
    get: required(c([
      key => `supervisor-sessions:${key}`,
      db.get,
      user => db.hget('supervisor-users', user),
      JSON.parse,
      user => {
        console.log(user)
        return user
      }
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
