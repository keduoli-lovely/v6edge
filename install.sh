#!/bin/sh
# cfedge 一键安装脚本（不依赖 OpenWrt 构建环境）
# 用法:
#   curl -fsSL https://raw.githubusercontent.com/keduoli-lovely/cfedge/main/install.sh | sh
#   BASE=https://example.com/cfedge sh install.sh
set -eu

BASE=${BASE:-https://raw.githubusercontent.com/keduoli-lovely/cfedge/main}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

say() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m!!\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" = "0" ] || die "请用 root 运行"

say "检测包管理器"
if command -v apk >/dev/null 2>&1; then
	PM="apk add --no-progress"
	PKGS="nginx-full acme-acmesh acme-acmesh-dnsapi curl ca-bundle openssl-util jsonfilter"
elif command -v opkg >/dev/null 2>&1; then
	PM="opkg install"
	PKGS="nginx-ssl acme acme-dnsapi curl ca-bundle openssl-util"
else
	die "找不到 apk/opkg，这不是 OpenWrt 系统"
fi

say "安装依赖: $PKGS"
$PM $PKGS || die "依赖安装失败（可先 opkg update / apk update）"

say "下载 cfedge"
curl -fsSL "$BASE/packages/cfedge/files/usr/bin/cfedge" -o "$TMP/cfedge" || die "下载失败"
curl -fsSL "$BASE/packages/cfedge/files/etc/config/cfedge" -o "$TMP/cfedge.config" || die "下载失败"

install -d /usr/bin /etc/config /etc/cfedge/certs /etc/cfedge/acme
install -m 755 "$TMP/cfedge" /usr/bin/cfedge
[ -f /etc/config/cfedge ] || install -m 600 "$TMP/cfedge.config" /etc/config/cfedge

say "安装 LuCI 页面（可选）"
install -d /usr/share/luci/menu.d /usr/share/rpcd/acl.d /www/luci-static/resources/view/cfedge
for f in \
	"packages/luci-app-cfedge/root/usr/share/luci/menu.d/luci-app-cfedge.json:/usr/share/luci/menu.d/luci-app-cfedge.json" \
	"packages/luci-app-cfedge/root/usr/share/rpcd/acl.d/luci-app-cfedge.json:/usr/share/rpcd/acl.d/luci-app-cfedge.json" \
	"packages/luci-app-cfedge/root/www/luci-static/resources/view/cfedge/main.js:/www/luci-static/resources/view/cfedge/main.js"
do
	src=${f%%:*}; dst=${f##*:}
	curl -fsSL "$BASE/$src" -o "$dst" || say "跳过 $src"
done
rm -f /tmp/luci-indexcache* 2>/dev/null || true
/etc/init.d/rpcd restart >/dev/null 2>&1 || true

say "完成。下一步："
cat <<'EOF'
  cfedge init --zone example.com --token '<CF_TOKEN>' --edge-port 8443
  cfedge cert
  cfedge add mysvc 192.168.1.10:8080 edge
  cfedge doctor
EOF
