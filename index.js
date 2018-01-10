'use strict'

const { createServer } = require('http')
const { Server: WebSocketServer } = require('uws')
const { c } = require('4k')
const server4k = require('4k/server')
const { required, optional } = require('4k/route-helper')
// const scaleway = require('./scaleway')
// const addProxy = require('./add-proxy')
const services = require('./services')
const github = require('./github')
const { DOMAIN, PORT } = process.env
const db = require('./redis')
const linesToJSONArray = ({ stdout }) =>
  JSON.parse(`[${stdout.trim().split('\n').join(',\n')}]`)

const routes = {
  OAUTH: { github: github.oauth },
  POST: {
    '/env': {
      description: 'update service environement',
      params: {
        name: required(String),
        env: required(src => Buffer(src, 'base64')),
      },
      handler: services.updateEnv,
    },
    '/add': {
      description: 'add a service',
      params: { name: required(String), repo: required(String) },
      handler: services.add,
    },
    '/restart': {
      description: 'restart a service',
      params: { name: required(String) },
      handler: services.restart,
    },
    '/stop': {
      description: 'stop a service',
      params: { name: required(String) },
      handler: services.stop,
    },
    '/update': {
      description: 'update a service',
      params: { name: required(String) },
      handler: services.update,
    },
    '/log': {
      description: 'update a service',
      params: { name: required(String), n: optional(Number()) },
      handler: params => services.log(params)
        .then(linesToJSONArray),
    },
  },
  GET: {
    '/services': {
      description: 'get service list',
      handler: services.getServices,
    },
  },
}

services.load()
  .catch(err => {
    console.error('error loading services', err)
    process.exit(1)
  })
  .then(() => {
    const reqHandler = server4k({
      routes,
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
    })
    const server = createServer(reqHandler).listen(PORT, () =>
      console.info(`server started: http://localhost:${PORT}`))
    const wss = new WebSocketServer({ server })
    console.log('starting websockets...')
    wss.on('connection', async ws => {
      const session = await reqHandler.session(ws.upgradeReq)
      console.log('new websocket user', session)
      // You might use location.query.access_token to authenticate or share sessions
      // or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)

      ws.on('message', function incoming(message) {
        console.log('received: %s', message)
      })
      ws.send('something')
    })
  })


module.exports = (async () => {
  /*
  const servers = (await scaleway.get.servers())
    .servers.reduce((a, s) => (a[s.id] = s, a), Object.create(null))
  */
})()
