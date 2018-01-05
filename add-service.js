const { fs: { writeFile, readFile }, child_process: { exec } } = require('4k')

const readJSON = async path => JSON.parse(await readFile(path, 'utf8'))

module.exports = async ({ name, env = {} }) => {
  const path = `/service/${name}`
  await Promise.all([
    // create user
    exec(`adduser --system --no-create-home --disabled-login --group ${name}`),
    // clone the repo
    exec(`git clone git@github.com:kigiri/service-${name}.git ${path}`),
  ])
  const [ pkg ] = await Promise.all([
    readJSON(`/${path}/package.json`),
    exec(`npm --prefix ${path} install ${path}`),
  ])
  const main = pkg.main || 'index'
  await Promise.all([
    // chown the folder
    exec(`chown ${name}:${name} -R ${path}`),
    // create systemd service file
    writeFile(`/etc/systemd/system/${name}.service`, `[Unit]
Description=My ${name[0].toUpperCase()+ name.slice(1)} Service
After=network.target

[Service]
Type=simple
User=${name}
WorkingDirectory=${path}
${Object.keys(env)
  .map(key => [ 'Environment', key, env[key] ].join('='))
  .join('\n')}
ExecStart=/usr/bin/node ${path}/${main}
Restart=always

[Install]
WantedBy=multi-user.target`, 'utf8'),
  ])
  // enable and start service
  return exec(`systemctl enable --now ${name}.service`)
}
