Name:           exotic-pets-site
Version:        1.0.0
Release:        3%{?dist}
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
install -m 644 .env.example %{buildroot}/etc/exoticpets/site.env

%files
%dir /srv/exoticpetssite
/srv/exoticpetssite/*
%dir /usr/share/exoticpets
%dir /usr/share/exoticpets/nginx
/usr/share/exoticpets/nginx/exoticpets.conf.template
%dir /usr/libexec/exoticpets
/usr/libexec/exoticpets/apply-nginx-conf.sh
%dir /etc/exoticpets
%config(noreplace) /etc/exoticpets/site.env

%post
set -eu
/usr/libexec/exoticpets/apply-nginx-conf.sh
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
systemctl restart nginx
if systemctl is-active --quiet firewalld; then
  firewall-cmd --permanent --add-port=4187/tcp
  firewall-cmd --reload
fi

%postun
if [ "$1" = 0 ]; then
  rm -f /etc/nginx/conf.d/exoticpets.conf
  if systemctl is-active --quiet nginx; then
    nginx -t && systemctl reload nginx || true
  fi
fi

