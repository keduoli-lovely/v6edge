#!/bin/sh
# 在设备上直接构建可安装的 .apk（ADB 格式）
#
# 前提：需要一个带 mkpkg 的 apk-tools 静态二进制（iStoreOS/OpenWrt 自带的 apk 没有 mkpkg）
#   BASE=https://dl-cdn.alpinelinux.org/alpine/edge/main/x86_64
#   curl -sL "$BASE/$(curl -sL "$BASE/" | grep -o 'apk-tools-static-[^"]*\.apk' | head -1)" -o /tmp/apkstatic.apk
#   mkdir -p /tmp/apkstatic && cd /tmp/apkstatic && apk extract --allow-untrusted ../apkstatic.apk
#   APK=/tmp/apkstatic/sbin/apk.static
#
# 用法（在路由器上，源码已安装或存在 /usr/bin/cfedge）：
#   sh tools/build-apk-on-device.sh /tmp/out
set -eu

APK=${APK:-/tmp/apkstatic/sbin/apk.static}
OUT=${1:-/tmp}
VER=0.1.0
REL=1

[ -x "$APK" ] || { echo "缺少 $APK（见脚本头部注释）" >&2; exit 1; }
[ -x /usr/bin/cfedge ] || { echo "先安装 cfedge 或放置 /usr/bin/cfedge" >&2; exit 1; }

mkdir -p "$OUT"

# --- 核心包 ---
S1=/tmp/stage-cfedge.$$
rm -rf "$S1"; mkdir -p "$S1/usr/bin" "$S1/usr/share/cfedge/defaults"
cp /usr/bin/cfedge "$S1/usr/bin/cfedge"; chmod 755 "$S1/usr/bin/cfedge"
cp /usr/share/cfedge/defaults/cfedge "$S1/usr/share/cfedge/defaults/cfedge" 2>/dev/null \
	|| cp /etc/config/cfedge "$S1/usr/share/cfedge/defaults/cfedge"
chmod 600 "$S1/usr/share/cfedge/defaults/cfedge"

cat > /tmp/post-cfedge.$$ <<'EOF'
#!/bin/sh
mkdir -p /etc/cfedge/certs /etc/cfedge/acme
if [ ! -f /etc/config/cfedge ]; then
	cp -f /usr/share/cfedge/defaults/cfedge /etc/config/cfedge
	chmod 600 /etc/config/cfedge
fi
exit 0
EOF
chmod 755 /tmp/post-cfedge.$$

"$APK" mkpkg \
	--info name:cfedge --info version:$VER-r$REL --info arch:x86_64 \
	--info description:'Cloudflare edge helper: AAAA + Let'"'"'s Encrypt + nginx TLS (IPv6 only)' \
	--info license:MIT --info url:https://github.com/keduoli-lovely/cfedge \
	--info depends:curl --info depends:ca-bundle --info depends:openssl-util \
	--files="$S1" --script post-install:/tmp/post-cfedge.$$ \
	-o "$OUT/cfedge-$VER-r$REL.apk"

# --- LuCI 包 ---
S2=/tmp/stage-luci.$$
rm -rf "$S2"
mkdir -p "$S2/usr/share/luci/menu.d" "$S2/usr/share/rpcd/acl.d" "$S2/www/luci-static/resources/view/cfedge"
cp /usr/share/luci/menu.d/luci-app-cfedge.json "$S2/usr/share/luci/menu.d/"
cp /usr/share/rpcd/acl.d/luci-app-cfedge.json "$S2/usr/share/rpcd/acl.d/"
cp /www/luci-static/resources/view/cfedge/main.js "$S2/www/luci-static/resources/view/cfedge/main.js"
chmod 644 "$S2/usr/share/luci/menu.d/luci-app-cfedge.json" \
	"$S2/usr/share/rpcd/acl.d/luci-app-cfedge.json" \
	"$S2/www/luci-static/resources/view/cfedge/main.js"

cat > /tmp/post-luci.$$ <<'EOF'
#!/bin/sh
rm -f /tmp/luci-indexcache* 2>/dev/null
/etc/init.d/rpcd restart >/dev/null 2>&1
exit 0
EOF
chmod 755 /tmp/post-luci.$$

"$APK" mkpkg \
	--info name:luci-app-cfedge --info version:$VER-r$REL --info arch:x86_64 \
	--info description:'LuCI app for cfedge' --info license:MIT \
	--info url:https://github.com/keduoli-lovely/cfedge \
	--info depends:cfedge --info depends:luci-base \
	--files="$S2" --script post-install:/tmp/post-luci.$$ \
	-o "$OUT/luci-app-cfedge-$VER-r$REL.apk"

rm -rf "$S1" "$S2" /tmp/post-cfedge.$$ /tmp/post-luci.$$
echo "构建完成:"
ls -l "$OUT"/cfedge-$VER-r$REL.apk "$OUT"/luci-app-cfedge-$VER-r$REL.apk
echo
echo "安装: apk add --allow-untrusted --force-overwrite $OUT/cfedge-$VER-r$REL.apk $OUT/luci-app-cfedge-$VER-r$REL.apk"
