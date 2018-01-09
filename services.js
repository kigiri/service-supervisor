const { execSync } = require('child_process')
const guessEnv = require('./guess-env-variables')
const {
  fs: {
    readdir,
    readFile,
    writeFile,
  },
  child_process: { exec },
} = require('4k')
const returnEmpty = () => '{}'
const readJSON = async path => JSON.parse(await readFile(path, 'utf8')
  .catch(returnEmpty))
const OK = () => 'OK'

const notJSON = name => !/\.json$/.test(name)
let _services = Object.create(null)
const readEnv = name => readJSON(`/service/${name}-env.json`)
const readPkg = name => readJSON(`/service/${name}/package.json`)
const load = async () => (await Promise.all((await readdir('/service'))
  .filter(notJSON)
  .map(name => Promise.all([
    readPkg(name),
    readEnv(name),
    name,
  ]))))
  .reduce((acc, [ pkg, env, name ]) =>
    (acc[name] = { ...pkg, env, name }, acc), _services = Object.create(null))

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
ExecStart=/usr/bin/node /service/${name}/${_services[name].main || 'index'}
Restart=always

[Install]
WantedBy=multi-user.target`, 'utf8')

const npm = {
  install: name => exec(`npm --prefix /service/${name} install /service/${name}`),
}

const git = {
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
    exec(`journalctl -u ${name}.service -n${n} -o json ${outputFields}`),
  enable: name => exec(`systemctl enable --now ${name}.service`),
  restart: name => exec(`systemctl restart ${name}.service`),
  start: name => exec(`systemctl start ${name}.service`),
  stop: name => exec(`systemctl stop ${name}.service`),
  daemonReload: () => exec(`systemctl daemon-reload`),
}

const createEnv = (name, env) =>
  writeFile(`/service/${name}-env.json`, env, 'utf8')

module.exports = {
  getServices: () => _services,
  load,
  add: async ({ name }) => {
    await Promise.all([
      exec(`adduser --system --no-create-home --disabled-login --group ${name}`),
      git.clone(name),
    ])
    const env = guessEnv(`/service/${name}`)
    const [ pkg ] = await Promise.all([
      readJSON(`/service/${name}/package.json`),
      npm.install(name),
    ])
    _services[name] = { ...pkg, env, name }
    await Promise.all([
      createEnv(name, JSON.stringify(env)),
      exec(`chown ${name}:${name} -R /service/${name}`),
      createSystemdService(name),
    ])
    return systemctl.enable(name)
  },
  log: ({ name, n }) => systemctl.log(name, n),
  stop: ({ name }) => systemctl.stop(name),
  start: ({ name }) => systemctl.start(name),
  restart: ({ name }) => systemctl.restart(name),
  update: async ({ name }) => {
    await git.pull(name)
    const [ pkg ] = await Promise.all([
      readPkg(name),
      npm.install(name), // su ${name} -c 'cmd' # maybe ?
    ])
    _services[name] = { ...pkg, name, env: _services[name].env }
    await createSystemdService(name)
    await systemctl.daemonReload()
    return systemctl.restart(name)
  },
  updateEnv: async ({ name, env }) => {
    _services[name].env = JSON.parse(env)
    await Promise.all([
      createSystemdService(name),
      createEnv(name, env),
    ])
    return systemctl.daemonReload().then(OK)
  },
}
