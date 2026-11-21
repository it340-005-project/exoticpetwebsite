# Exotic Pets site

Nginx serves this static site.

## Build

```bash
sudo dnf install -y rpm-build nginx gettext
bash packaging/build-rpm.sh
```

The package is written under `~/rpmbuild/RPMS/noarch/`.

## Install

```bash
sudo dnf install -y ~/rpmbuild/RPMS/noarch/exotic-pets-site-1.0.0-*.rpm
```

Install enables nginx, writes to `/etc/nginx/conf.d/exoticpets.conf`, allows SELinux to bind port `4187`, and opens that port when firewalld is running. 

The site will listen on port `4187`.

After, start nginx:

```bash
sudo dnf install -y policycoreutils-python-utils
sudo semanage port -a -t http_port_t -p tcp 4187 || sudo semanage port -m -t http_port_t -p tcp 4187
sudo systemctl start nginx
```

## API address

Edit `/etc/exoticpets/site.env` and set `BACKEND_URL` to the API, for example `http://10.10.20.10:4193` in the proxmox. Leave `LISTEN_PORT` at `4187`. 

Then regenerate the nginx config and reload using:

```bash
sudo /usr/libexec/exoticpets/apply-nginx-conf.sh
sudo nginx -t
sudo systemctl reload nginx
```

The site is at `http://<this-vm>:4187/`.
