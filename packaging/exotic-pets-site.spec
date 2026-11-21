Name:           exotic-pets-site
Version:        1.0.0
Release:        4%{?dist}
Summary:        Exotic Pets store site served by nginx

License:        Proprietary
BuildArch:      noarch
Source0:        %{name}-%{version}.tar.gz

Requires:       nginx
Requires:       gettext
Requires(post): nginx
Requires(post): gettext
Requires(post): systemd
Requires(post): policycoreutils-python-utils

%description
Static pages for the Exotic Pets store. Nginx serves the site and proxies
/B_ requests to the separate API. This package does not run the API.

%prep
%setup -q

%build

%install
install -d %{buildroot}/srv/exoticpetssite
install -d %{buildroot}/usr/share/exoticpets/nginx
install -d %{buildroot}/usr/libexec/exoticpets
install -d %{buildroot}/etc/exoticpets

find . -maxdepth 1 -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' \) \
  -exec install -m 644 {} %{buildroot}/srv/exoticpetssite/ \;
install -m 644 nginx/exoticpets.conf.template %{buildroot}/usr/share/exoticpets/nginx/exoticpets.conf.template
install -m 755 packaging/apply-nginx-conf.sh %{buildroot}/usr/libexec/exoticpets/apply-nginx-conf.sh
install -m 755 packaging/prepare-nginx.sh %{buildroot}/usr/libexec/exoticpets/prepare-nginx.sh
install -m 644 .env.example %{buildroot}/etc/exoticpets/site.env

%files
%dir /srv/exoticpetssite
/srv/exoticpetssite/*
%dir /usr/share/exoticpets
%dir /usr/share/exoticpets/nginx
/usr/share/exoticpets/nginx/exoticpets.conf.template
%dir /usr/libexec/exoticpets
/usr/libexec/exoticpets/apply-nginx-conf.sh
/usr/libexec/exoticpets/prepare-nginx.sh
%dir /etc/exoticpets
%config(noreplace) /etc/exoticpets/site.env

%post
set -eu
/usr/libexec/exoticpets/apply-nginx-conf.sh
/usr/libexec/exoticpets/prepare-nginx.sh
if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce)" != "Disabled" ] && command -v semanage >/dev/null 2>&1; then
  semanage port -a -t http_port_t -p tcp 4187 >/dev/null 2>&1 || semanage port -m -t http_port_t -p tcp 4187
  semanage fcontext -a -t httpd_sys_content_t '/srv/exoticpetssite(/.*)?' >/dev/null 2>&1 || semanage fcontext -m -t httpd_sys_content_t '/srv/exoticpetssite(/.*)?'
  restorecon -RF /srv/exoticpetssite
  restorecon -F /etc/nginx/conf.d/exoticpets.conf
  setsebool -P httpd_can_network_connect 1
fi
nginx -t
systemctl enable nginx
systemctl reset-failed nginx >/dev/null 2>&1 || true
systemctl start nginx
if systemctl is-active --quiet firewalld; then
  firewall-cmd --permanent --add-port=4187/tcp
  firewall-cmd --reload
fi

%postun
if [ "$1" = 0 ]; then
  rm -f /etc/nginx/conf.d/exoticpets.conf
  if [[ -f /etc/nginx/nginx.conf.exoticpets-orig ]]; then
    mv -f /etc/nginx/nginx.conf.exoticpets-orig /etc/nginx/nginx.conf
  fi
  if [[ -f /etc/nginx/conf.d/default.conf.exoticpets-disabled ]]; then
    mv -f /etc/nginx/conf.d/default.conf.exoticpets-disabled /etc/nginx/conf.d/default.conf
  fi
  if systemctl is-active --quiet nginx; then
    nginx -t && systemctl reload nginx || true
  fi
fi

%changelog
* Sat Nov 21 2026 Exotic Pets <exoticpets@localhost> - 1.0.0-4
- Free leftover nginx ports and disable the default listen 80 vhost.
* Sat Nov 21 2026 Exotic Pets <exoticpets@localhost> - 1.0.0-3
- Label the site and nginx config, then restart nginx instead of reloading it.
* Sat Nov 21 2026 Exotic Pets <exoticpets@localhost> - 1.0.0-2
- Allow nginx to bind to port 4187 under SELinux.
* Sat Nov 21 2026 Exotic Pets <exoticpets@localhost> - 1.0.0-1
- Package the static site for nginx on Fedora.

