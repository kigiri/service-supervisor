'use strict'

const api = require('4k/api')
const { use } = require('4k/request')

module.exports = api(use({
  host: 'cp-par1.scaleway.com',
  headers: {
    'X-Auth-Token': process.env.SCALEWAY_API_TOKEN,
    'Content-Type': 'application/json',
  },
}))
