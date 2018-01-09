const { child_process: { exec } } = require('4k')
const services = require('./services')
const addProxy = require('./add-proxy')

;(async () => {
  console.log('adding service and nginx proxy...')
  await Promise.all([
    addProxy({ name: 'supervisor.oct.ovh', port: process.env.PORT })
      .then(() => console.log('nginx proxy added')),

    services.add({ name: 'supervisor' })
      .then(() => console.log('service enabled')),
  ])
})().catch(console.error)

/*
cat > /root/ssl/cert.pem << EOL
-----BEGIN CERTIFICATE-----
MIIEmjCCA4KgAwIBAgIUERswifSyKmEKTv/MWTvt3yVbx9QwDQYJKoZIhvcNAQEL
BQAwgYsxCzAJBgNVBAYTAlVTMRkwFwYDVQQKExBDbG91ZEZsYXJlLCBJbmMuMTQw
MgYDVQQLEytDbG91ZEZsYXJlIE9yaWdpbiBTU0wgQ2VydGlmaWNhdGUgQXV0aG9y
aXR5MRYwFAYDVQQHEw1TYW4gRnJhbmNpc2NvMRMwEQYDVQQIEwpDYWxpZm9ybmlh
MB4XDTE4MDEwOTE1NDUwMFoXDTMzMDEwNTE1NDUwMFowYjEZMBcGA1UEChMQQ2xv
dWRGbGFyZSwgSW5jLjEdMBsGA1UECxMUQ2xvdWRGbGFyZSBPcmlnaW4gQ0ExJjAk
BgNVBAMTHUNsb3VkRmxhcmUgT3JpZ2luIENlcnRpZmljYXRlMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtUKhIs7nkMLZ4IFop8YnhChfH+SfAuKzGHRz
VNbUqaUPIeUOfsuU921DmQ6D7ue0PnR/MyeY7PewrrpKsAbko1h3/TrBJeJudoma
anwY4k2oJQXeP1sV68MU7ipvauRd9wlOgiEnJsupHHcub9srGFbx7UWRVX4KAcJq
DNqb+8qKCGFulYi0wh/SU7eA8PaZnRNavjElCkjSJTL6dL++9/Y/hkwhoyS3iA3T
S3Q/9fiiOK0bKXlVAe/jElYTv6kmPO4ZLtE6ici1AiwDaLXLb+43vp2NSPWS7gPu
otLfouruzHUJ3q6LSSG1tL9c0TTkJRux3mY/YjCichsroctLrQIDAQABo4IBHDCC
ARgwDgYDVR0PAQH/BAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMCBggrBgEFBQcD
ATAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBS6WHnasSmj4FJUmYWMGbDw2uxCwTAf
BgNVHSMEGDAWgBQk6FNXXXw0QIep65TbuuEWePwppDBABggrBgEFBQcBAQQ0MDIw
MAYIKwYBBQUHMAGGJGh0dHA6Ly9vY3NwLmNsb3VkZmxhcmUuY29tL29yaWdpbl9j
YTAdBgNVHREEFjAUggkqLm9jdC5vdmiCB29jdC5vdmgwOAYDVR0fBDEwLzAtoCug
KYYnaHR0cDovL2NybC5jbG91ZGZsYXJlLmNvbS9vcmlnaW5fY2EuY3JsMA0GCSqG
SIb3DQEBCwUAA4IBAQAml3g6VbP4T6AEcugebGboV97wuHJaWwAbvd0Jukji1n4i
nZ2pChV+WWfa+HfKeVBicS3ebYX8pBe8PqNBSykjY6ZFUjKao8vMvxFx9lxcHcT7
Sxi8Wjtp+oH03dYIrVUYtDls5kdxr831/tINjM1X46PYQFKr0AeyNP9TvT5TTEye
ghdqImNowu4tQw0806mDqAIj79QtEl564PyR4YjlYFz0SdwTokty9RY3bGy782dR
QOphGa04C6Rcgr+8AOWtq/w/ONkLZ0KMMA92RSPMolZUtitNpmbNTawdiQsFxhS9
BYZR819xNfSeDo+pdwoBcJ/4XiXalsZVaTB3ZmgC
-----END CERTIFICATE-----
EOL

cat > /root/ssl/key.pem << EOL
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC1QqEizueQwtng
gWinxieEKF8f5J8C4rMYdHNU1tSppQ8h5Q5+y5T3bUOZDoPu57Q+dH8zJ5js97Cu
ukqwBuSjWHf9OsEl4m52iZpqfBjiTaglBd4/WxXrwxTuKm9q5F33CU6CIScmy6kc
dy5v2ysYVvHtRZFVfgoBwmoM2pv7yooIYW6ViLTCH9JTt4Dw9pmdE1q+MSUKSNIl
Mvp0v7739j+GTCGjJLeIDdNLdD/1+KI4rRspeVUB7+MSVhO/qSY87hku0TqJyLUC
LANotctv7je+nY1I9ZLuA+6i0t+i6u7MdQnerotJIbW0v1zRNOQlG7HeZj9iMKJy
Gyuhy0utAgMBAAECggEABmSnsgGG19fO8GxgERD+dzNOkDsbA8FZEBfnsrRaVC5k
hNwls9BrV0gEY70qjruzRc2Vyqa45BykFe90e9sYif6wXfpPKHrDnDHLhFeFHD7m
LuRryUYgt6cBrJkjfdLC+WHva7h/8I41dsWQcoE+ds3FVrHdAGwGGlUrHt4sl4Bs
HS6rZCYAe7dixdwyvTH/Kr8ZiDboq5dC7B2hsJE4l1W7qFeQYoMmVjgmWA6En5Up
43x75hO9m874BVobmnoya6JyAV6SloyY21J+VNFID0juatJ0KkYyfNEapyXbCqFt
x5gR/ZWdOrhZIL/UTCpdkoBbM5LIhy0ZQONTDjDwGQKBgQDdSeMjNYYAqHnk7+uV
I3NDcwk+iFTJaHrTU/9/+fDnmDvzTYW6fdVRKTjggxWDJHcFhJ0rPYlxLvk3uoeu
pddMtl9xElVO9ioAmwCETOBybQrPhrWuZgZIOA0Y0Dq8tX+QK/y/p09vW0Jn4Hot
afi2+IZpvD3U4HQ1S9KEcIEe0wKBgQDRsVrx1WLh+zt4GME0sQdcLn2zd4dOoKux
Diu7BAS9yf5bohKRlGIQorWjRruODeEi14L/IDMFfZJrAUnm2cLKag7+pvDxmmxa
sDvbiE7NM18nq6/Bq59ZXuSLM4C0ctP9g8KN+03lQByXKNyKGTqEyokqmMwKVIpw
iqkP2BhbfwKBgBFGP1D0UK2keT+B6yYNSmYtiL807Ul7unrcx8k5vbCWlbd8ib/x
KsHXMfV0xi0in5fyrkI934jSXeoXyZe8on3+jpzJDZfIZ6b8cqHhTnQgRwPERFKE
7GCe34bcWnl4waiDhot/iBftS9XIFEGPUDcYV4XRiBIiI3A1pw1nquy5AoGBAMCI
haZydP5k/O+CWzOUL9vV3BjCcPwizkIdbs2iHPBd3Swpnb8JbRk1LG2kbmU6HTMu
idrSp8YszBlv73kFDLNpuibbBXPwg/iow+0INMJ4nrAAFbpPaFpYpKOjQFNu83Jc
XnCbA6Swvw+Ttxsdmvt+M39nGEGL6ij3R8+CbKrlAoGBALq8L5SOkN3DQGbRTFZW
FlG/Rgl6neakqivBUe3vlEZaUziw7X65MvLTt7G9NPSEgVZeCMBgEvu7fxYqXzaK
pePSEby3ZNXhVsPywfVc7h8McWylbVwGSxdwqspoPI1ZpEQZek3rd8R3/McNdEOf
40G5ZIMwxAKo27T5OSx+tOyz
-----END PRIVATE KEY-----
EOL

git clone https://github.com/kigiri/service-supervisor.git
cd service-supervisor
npm install
PORT=6789 \
DOMAIN=oct.ovh \
SCALEWAY_API_TOKEN=d01dfd4e-9d72-4463-a1e3-b287c610db38 \
GITHUB_CLIENT_ID=ae69be29019c3f469e6a \
GITHUB_CLIENT_SECRET=e9341f3e98d87caf1d45d0a29af560db5c2875d2 \
node setup
*/
