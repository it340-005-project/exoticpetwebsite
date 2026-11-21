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
sudo dnf install -y ~/rpmbuild/RPMS/noarch/exotic-pets-site-1.0.0-1*.rpm
```

Install enables nginx, writes `/etc/nginx/conf.d/exoticpets.conf`, and opens port `4187` when firewalld is running. The site listens on port `4187`.

## API address

Edit `/etc/exoticpets/site.env` and set `BACKEND_URL` to the API, for example `http://10.10.20.10:4193` in the proxmox. Leave `LISTEN_PORT` at `4187`. 

Then regenerate the nginx config and reload using:

```bash
sudo /usr/libexec/exoticpets/apply-nginx-conf.sh
sudo nginx -t
sudo systemctl reload nginx
```

The site is at `http://<this-vm>:4187/`.
