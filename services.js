const { execSync, spawn } = require('child_process')
const guessEnv = require('./guess-env-variables')
const EventEmitter = require('events')
const {
  fs: { readdir, readFile, writeFile },
  child_process: { exec },
} = require('4k')
const returnEmpty = () => '{}'
const readJSON = async path => JSON.parse(await readFile(path, 'utf8')
  .catch(returnEmpty))
const OK = () => 'OK'

const notConfFile = name => !/\.(json|port)$/.test(name)
const _services = Object.create(null)
const readEnv = name => readJSON(`/service/${name}-env.json`)
const readPkg = name => readJSON(`/service/${name}/package.json`)
const setPort = (name, port) =>
  process.env[`SERVICE_${name.toUpperCase()}_PORT`] = port

const getBusInfo = ((parser, commandBase, commandEnd) => name => {
  const rootCmd = `${commandBase}${name}${commandEnd}`
  const { PID, started, stopped } = (await Promise.all([
    exec(`${rootCmd}Service ExecMainPID`),
    exec(`${rootCmd}Unit ActiveEnterTimestamp`),
    exec(`${rootCmd}Unit ActiveExitTimestamp`),
  ])).map(parser)

  return { PID, started, stopped }
})(s => Number(s.split(' ')[1].slice(0, 13)), [
  'busctl get-property',
  'org.freedesktop.systemd1 /org/freedesktop/systemd1/unit/',
].join(' '), '_2eservice org.freedesktop.systemd1.')

const load = async () => (await Promise.all((await readdir('/service'))
  .filter(notConfFile)
  .map(name => Promise.all([
    readPkg(name),
    readEnv(name),
    name,
    readFile(`/service/${name}.port`, 'utf8'),
    getBusInfo(name),
  ]))))
  .reduce((acc, [ pkg, env, name, port, status ]) => (acc[name] = {
    ...pkg,
    ...status,
    env,
    name,
    port: setPort(name, port.trim()),
  }, acc), _services)
// git --no-pager log -1 --pretty=format:"%H$%ct$%cn$%ce$%s"

const statusEvent = new EventEmitter
const sendLog = data => {
  if (!data) return
  try {
    const log = JSON.parse(data)
    if (!isDoneStatus(log)) return
    const name = log.UNIT.slice(0, -8)
    const key = log.MESSAGE.split(' ')[0].toLowerCase()
    if (!_services[name]) return
    const time = _services[name][key] = log.__REALTIME_TIMESTAMP
    console.log({ name, key, time })
    statusEvent.emit('data',
      `{"status":true,"name":"${name}","key":"${key}","time":"${time}"}`)
  } catch (err) {
    console.log('parse failed', err, data)
  }
}

statusEvent.start = () => {
  console.log('subscribing to systemd events')
  statusEvent.logger && statusEvent.logger.kill()
  console.log('listenning to', Object.keys(_services).map(k => `-u${k}`))
  const logger = statusEvent.logger = spawn('journalctl', [
    '-tsystemd',
    '-ojson',
    '-n0',
    '-f',
    ].concat(Object.keys(_services).map(k => `-u${k}`)))
  logger.stdout.on('data', data => String(data).split('\n').forEach(sendLog))
  logger.on('close', statusEvent.start)
}

const createSystemdService = name =>
  writeFile(`/etc/systemd/system/${name}.service`, `[Unit]
Description=${_services[name].description || ('My '+ name +' Service')}
After=network.target

[Service]
Type=simple
User=${_services[name].user || name}
WorkingDirectory=/service/${name}
${Object.keys(_services[name].env)
  .map(key => [ 'Environment', key, _services[name].env[key] ].join('='))
  .join('\n')}
${[ name ].concat(_services[name].service || []).map(key =>
  `Environment=SERVICE_${key.toUpperCase()}_PORT=${_services[key].port}`)}
ExecStart=/usr/bin/node /service/${name}/${_services[name].main || 'index'}
Restart=always

[Install]
WantedBy=multi-user.target`, 'utf8')

const npm = {
  install: name => exec(`npm --prefix /service/${name} install /service/${name}`),
}

const git = {
  stash: name => exec(`git -C /service/${name} stash`),
  pull: name => exec(`git -C /service/${name} pull origin master`),
  clone: name =>
    exec(`git clone https://github.com/kigiri/service-${name}.git /service/${name}`),
}

const systemdVersion = Number(String(execSync('systemd --version'))
  .split(/systemd ([0-9]+)/)[1])

const outputFields = systemdVersion >= 236 ? '--output-fields='+ [
  '_BOOT_ID',
  '_SOURCE_REALTIME_TIMESTAMP',
  '_TRANSPORT',
  'MESSAGE',
  'MESSAGE_ID',
  'PRIORITY',
  'SYSLOG_IDENTIFIER',
].join() : ''

const systemctl = {
  version: systemdVersion,
  log: (name, n=30) =>
    exec(`journalctl -tnode -u${name}.service -n${n} -ojson ${outputFields}`),
  enable: name => exec(`systemctl enable --now ${name}.service`),
  restart: name => exec(`systemctl restart ${name}.service`),
  start: name => exec(`systemctl start ${name}.service`),
  stop: name => exec(`systemctl stop ${name}.service`),
  daemonReload: () => exec(`systemctl daemon-reload`),
}

const createEnv = (name, env) =>
  writeFile(`/service/${name}-env.json`, env, 'utf8')

const generatePort = usedPorts => {
  const port = String(Math.random()).split(/([1-9][0-9]{3})/)[1]

  return usedPorts.includes(port)
    ? generatePort(usedPorts)
    : port
}

const checkName = name => {
  if (name in _services) return name
  throw Error(`Service ${name} not found`)
}

const getUsedPortsCmd = 'ss -ltpn | tail -n +2 | cut -d":" -f2 | cut -d" " -f1'

module.exports = {
  getServices: () => _services,
  load,
  statusEvent,
  add: async ({ name }) => {
    await Promise.all([
      exec(`adduser --system --no-create-home --disabled-login --group ${name}`),
      git.clone(name),
    ])
    const [ pkg, env, usedPorts ] = await Promise.all([
      readJSON(`/service/${name}/package.json`),
      guessEnv(`/service/${name}`),
      exec(getUsedPortsCmd),
      npm.install(name),
    ])

    const reservedPorts = Object.keys(_services)
      .map(key => String(_services[key].port))

    const port = setPort(name, generatePort(usedPorts.concat(reservedPorts)))
    _services[name] = { ...pkg, env, name, port }
    statusEvent.start()
    await Promise.all([
      createEnv(name, JSON.stringify(env)),
      writeFile(`/service/${name}.port`, port),
      exec(`chown ${name}:${name} -R /service/${name}`),
      createSystemdService(name),
    ])
    return systemctl.enable(name)
  },
  sub: ({ data: name, ws, send }) => {
    try { checkName(name) } catch (err) { return console.error(err) }
    if (ws.logger && ws.logger.serviceName === name) return
    ws.logger && ws.logger.kill()
    ws.logger = spawn('journalctl', [
      '-tnode',
      `-u${name}.service`,
      '-ojson',
      '-n50',
      '-f',
      outputFields,
    ].filter(Boolean))
    ws.logger.serviceName = name
    ws.logger.stdout.on('data', send)
  },
  unsub: ({ ws }) => ws.logger && (ws.logger.kill(), ws.logger = undefined),
  log: ({ name, n }) => systemctl.log(checkName(name), n),
  stop: ({ name }) => systemctl.stop(checkName(name)),
  start: ({ name }) => systemctl.start(checkName(name)),
  restart: ({ name }) => systemctl.restart(checkName(name)),
  update: async ({ name }) => {
    checkName(name)
    await git.stash(name)
    await git.pull(name)
    const [ pkg, port ] = await Promise.all([
      readPkg(name),
      readFile(`/service/${name}.port`, 'utf8'),
      npm.install(name), // su ${name} -c 'cmd' # maybe ?
    ])
    Object.assign(_services[name], pkg, { name, port: port.trim() })
    await createSystemdService(name)
    await systemctl.daemonReload()
    return systemctl.restart(name)
  },
  updateEnv: async ({ name, env }) => {
    checkName(name)
    _services[name].env = JSON.parse(env)
    await Promise.all([
      createSystemdService(name),
      createEnv(name, env),
    ])
    return systemctl.daemonReload().then(OK)
  },
}
