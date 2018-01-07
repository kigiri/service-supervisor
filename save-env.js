const { fs: { writeFile } } = require('4k')

module.exports = async ({ name, env }) =>
  await writeFile(`/service/${name}-env.json`, env, 'utf8')
