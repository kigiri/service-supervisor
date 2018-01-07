const { fs: { writeFile } } = require('4k')

const OK = () => 'OK'
module.exports = ({ name, env }) => writeFile(`/service/${name}-env.json`, env, 'utf8').then(OK)
