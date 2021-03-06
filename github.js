const { use, t, post } = require('4k/request')
const { randomBytes } = require('crypto')
const { c, to } = require('4k')
const { optional } = require('4k/route-helper')
const api = require('4k/api')
const db = require('./redis')
const DAY = 86400

const prepareOpts = c.fast([
  use({
    host: 'api.github.com',
    headers: { 'User-Agent': 'Kigiri-Supervisor' },
  }),
  t(opts => opts.headers.Authorization = `token ${opts.token}`),
])

const v3 = api(prepareOpts)
const v4 = query => token =>
  post(prepareOpts({ token, path: '/graphql', body: `{"query": "${query}"}` }))

const getUserInfo = c([
  v4('query { viewer { id email login avatarUrl name } }'),
  to.data.viewer,
])

const getEmail = c([
  v3.get.user.emails,
  c.Array.filter(to.primary),
  to[0].email,
])

const oauth = {
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  accessUrl: 'https://github.com/login/oauth/access_token',
  params: { redirectTo: optional(String) },
  setState: ({ redirectTo, req }) => {
    redirectTo || (redirectTo = req.headers.referer)
    const key = randomBytes(12)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '-')

    return db.set(`supervisor-sessions:${key}`, redirectTo || '/', 'NX', 'EX', DAY)
      .then(success => success ? key : oauth.setState(res))
  },
  handler: ({ access_token: token, scope, token_type, state, error, req }) =>
    error
      ? Promise.reject(Error(error))
      : getUserInfo(token)
        .then(async user => {
          const [ email, url ] = await Promise.all([
            user.email || getEmail(token),
            db.get(`supervisor-sessions:${state}`),
          ])

          user.token = token
          user.email = email

          await Promise.all([
            db.setex(`supervisor-sessions:${state}`, 14 * DAY, user.id),
            db.hsetnx('supervisor-users', user.id, JSON.stringify(user)),
          ])
          return { state, url }
        })
        .catch(err => (console.log(err), err)),
  opts: {
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET,
    scope: [
      'admin:org',
      'admin:public_key',
      'admin:repo_hook',
      'gist',
      'public_repo',
      'user',
    ].join(' '),
  },
}

const github = module.exports = {
  v3,
  v4,
  oauth,
  email: getEmail,
  login: c([
    v4('query { viewer { login }}'),
    to.data.viewer.login,
  ]),
}
