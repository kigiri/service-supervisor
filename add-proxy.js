const { fs: { writeFile }, child_process: { exec } } = require('4k')

const proxyConf = ({ name, ip }) =>
  writeFile(`/etc/nginx/sites-enabled/${name}`, `server {
  server_name www.${name};
  return 301 $scheme://${name}$request_uri;
}

server {
  listen 80;
  server_name ${name};
  return 301 https://$server_name$request_uri;
}

server {
  listen 443;
  server_name ${name};

  location / {
    proxy_pass http://${ip || 'localhost'};
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
