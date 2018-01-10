const { fs: { writeFile }, child_process: { exec } } = require('4k')

const proxyConf = ({ name, ip, port }) =>
  writeFile(`/etc/nginx/sites-enabled/${name}`, `server {
  listen 80;
  listen 443 default ssl;
  server_name ${name};

  ssl_certificate /root/ssl/cert.pem;
  ssl_certificate_key /root/ssl/key.pem;

  location / {
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
    if ($request_method = 'OPTIONS') {
      add_header 'Access-Control-Max-Age' 1728000;
      add_header 'Content-Type' 'text/plain; charset=utf-8';
      add_header 'Content-Length' 0;
      return 204;
    }
    proxy_pass http://${ip || ('localhost:'+ port)};
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Connection "upgrade";
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 86400;
  }
}`, 'utf8')

const reloadNginx = () => exec('/usr/sbin/nginx -s reload')

module.exports = opts => proxyConf(opts).then(reloadNginx)
