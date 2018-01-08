const { fs: { readdir, readFile }, child_process: { exec } } = require('4k')
const readJSON = async path => JSON.parse(await readFile(path, 'utf8'))
const OK = () => 'OK'

const notJSON = name => !/\.json$/.test(name)
let _services = Object.create(null)
const readEnv = name => readJSON(`/service/${name}-env.json`).catch(() => ({}))
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
Description=My ${name[0].toUpperCase()+ name.slice(1)} Service
After=network.target

[Service]
Type=simple
User=${name}
WorkingDirectory=/service/${name}
${Object.keys(_services[name].env)
  .map(key => [ 'Environment', key, _services[name].env[key] ].join('='))
  .join('\n')}
ExecStart=/usr/bin/node /service/${name}/${main}
Restart=always

[Install]
WantedBy=multi-user.target`, 'utf8')

const npm = {
  install: name => exec(`npm --prefix /service/${name} install /service/${name}`),
}

const git = {
  pull: name => exec(`git -C /service/${name} pull origin master`),
  clone: name =>
    exec(`git clone git@github.com:kigiri/service-${name}.git /service/${name}`),
}

const systemctl = {
  log: (name, n=30) => exec(`journalctl -u ${name}.service -n${n} -o json`),
  enable: name => exec(`systemctl enable --now ${name}.service`),
  restart: name => exec(`systemctl restart ${name}.service`),
  start: name => exec(`systemctl start ${name}.service`),
  stop: name => exec(`systemctl stop ${name}.service`),
}

const createEnv = (name, env) =>
  writeFile(`/service/${name}-env.json`, env, 'utf8')

module.exports = {
  getServices: () => _services,
  load,
  add: async name => {
    await Promise.all([
      exec(`adduser --system --no-create-home --disabled-login --group ${name}`),
      git.clone(name),
    ])
    const [ pkg ] = await Promise.all([
      readJSON(`/service/${name}/package.json`),
      npm.install(name),
    ])
    const main = pkg.main || 'index'
    _services[name] = { ...pkg, env: {}, name }
    await Promise.all([
      createEnv(name, '{}'),
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
    await systemctl.restart(name)
  },
  updateEnv: ({ name, env }) => {
    _services[name].env = JSON.parse(env)
    return Promise.all([
      createSystemdService(name),
      createEnv(name, env),
    ]).then(OK)
  },
}