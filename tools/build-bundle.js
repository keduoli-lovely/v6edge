// 生成发行产物：
//   dist/v6edge-<ver>.run                     自解压安装器（iStoreOS 离线页 / 任意 shell）
//   dist/v6edge-<ver>-bundle.tar.gz           解压后 sh install.sh
//   dist/v6edge_<ver>-24_all.ipk              opkg 系（OpenWrt 24.10 / 旧 iStoreOS 24.x）
//   dist/luci-app-v6edge_<ver>-24_all.ipk     同上，LuCI 部分
// 25.x 的 .apk 用 tools/build-apk-on-device.sh 在设备上生成（ADB 格式，需 mkpkg）
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PKG = path.join(ROOT, 'packages');
const DIST = path.join(ROOT, 'dist');
const VER = '0.1.0';

const CORE = [
	['usr/bin/v6edge', path.join(PKG, 'v6edge/files/usr/bin/v6edge'), 0o755],
	['usr/share/v6edge/defaults/v6edge', path.join(PKG, 'v6edge/files/etc/config/v6edge'), 0o600]
];
const LUCI = [
	['usr/share/luci/menu.d/luci-app-v6edge.json',
		path.join(PKG, 'luci-app-v6edge/root/usr/share/luci/menu.d/luci-app-v6edge.json'), 0o644],
	['usr/share/rpcd/acl.d/luci-app-v6edge.json',
		path.join(PKG, 'luci-app-v6edge/root/usr/share/rpcd/acl.d/luci-app-v6edge.json'), 0o644],
	['www/luci-static/resources/view/v6edge/main.js',
		path.join(PKG, 'luci-app-v6edge/root/www/luci-static/resources/view/v6edge/main.js'), 0o644]
];

const INSTALL_SH = [
	'#!/bin/sh',
	'# v6edge 安装脚本（幂等）',
	'#   sh install.sh            升级/安装，保留现有 /etc/config/v6edge 与 /etc/v6edge 状态',
	'#   sh install.sh --fresh    测试用：把现有配置和状态改名备份，按全新环境安装',
	'set -e',
	'cd "$(dirname "$0")"',
	'TS=$(date +%Y%m%d-%H%M%S)',
	'',
	'if [ "${1:-}" = "--fresh" ]; then',
	'\t[ -f /etc/config/v6edge ] && mv /etc/config/v6edge "/etc/config/v6edge.bak-$TS" && echo "配置已备份为 /etc/config/v6edge.bak-$TS"',
	'\t[ -d /etc/v6edge ] && mv /etc/v6edge "/etc/v6edge.bak-$TS" && echo "状态目录已备份为 /etc/v6edge.bak-$TS"',
	'fi',
	'',
	'mkdir -p /usr/bin /usr/share/v6edge/defaults /usr/share/luci/menu.d /usr/share/rpcd/acl.d \\',
	'         /www/luci-static/resources/view/v6edge /etc/v6edge/certs /etc/v6edge/acme',
	'cp -f usr/bin/v6edge /usr/bin/v6edge',
	'chmod 755 /usr/bin/v6edge',
	'ln -sf /usr/bin/v6edge /usr/bin/cfedge 2>/dev/null || true',
	'cp -f usr/share/v6edge/defaults/v6edge /usr/share/v6edge/defaults/v6edge',
	'if [ ! -f /etc/config/v6edge ]; then',
	'\tcp -f usr/share/v6edge/defaults/v6edge /etc/config/v6edge',
	'\tchmod 600 /etc/config/v6edge',
	'\techo "已写入默认配置 /etc/config/v6edge"',
	'else',
	'\techo "保留现有配置 /etc/config/v6edge"',
	'fi',
	'cp -f usr/share/luci/menu.d/luci-app-v6edge.json /usr/share/luci/menu.d/luci-app-v6edge.json',
	'cp -f usr/share/rpcd/acl.d/luci-app-v6edge.json /usr/share/rpcd/acl.d/luci-app-v6edge.json',
	'cp -f www/luci-static/resources/view/v6edge/main.js /www/luci-static/resources/view/v6edge/main.js',
	'chmod 644 /usr/share/luci/menu.d/luci-app-v6edge.json \\',
	'          /usr/share/rpcd/acl.d/luci-app-v6edge.json \\',
	'          /www/luci-static/resources/view/v6edge/main.js',
	'rm -f /tmp/luci-indexcache* 2>/dev/null || true',
	'/etc/init.d/rpcd restart >/dev/null 2>&1 || true',
	'echo "v6edge ' + VER + ' 安装完成"',
	'echo "下一步: v6edge init --zone <域名> --token <CF_TOKEN>（或直接在 LuCI 里点）"'
].join('\n') + '\n';

fs.mkdirSync(DIST, { recursive: true });

/* ---------- bundle ---------- */
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'v6edge-stage-'));
for (const [rel, src, mode] of CORE.concat(LUCI)) {
	const dst = path.join(stage, rel);
	fs.mkdirSync(path.dirname(dst), { recursive: true });
	fs.copyFileSync(src, dst);
	fs.chmodSync(dst, mode);
}
fs.writeFileSync(path.join(stage, 'install.sh'), INSTALL_SH);
fs.chmodSync(path.join(stage, 'install.sh'), 0o755);

const bundle = path.join(DIST, `v6edge-${VER}-bundle.tar.gz`);
execSync(`tar -czf "${bundle}" -C "${stage}" .`, { stdio: 'inherit' });
console.log('built', bundle, (fs.statSync(bundle).size / 1024).toFixed(1) + ' KB');

/* ---------- .run ---------- */
const payload = fs.readFileSync(bundle);
const runHeader = [
	'#!/bin/sh',
	'# v6edge ' + VER + ' 自解压安装器',
	'# 用法: sh v6edge-' + VER + '.run [--fresh]',
	'set -e',
	'TMP=$(mktemp -d /tmp/v6edge-run.XXXXXX)',
	'MARK=$(awk \'/^__PAYLOAD_BELOW__$/{print NR+1; exit}\' "$0")',
	'tail -n +"$MARK" "$0" > "$TMP/payload.tar.gz"',
	'tar -xzf "$TMP/payload.tar.gz" -C "$TMP"',
	'sh "$TMP/install.sh" "$@"',
	'rc=$?',
	'rm -rf "$TMP"',
	'exit $rc',
	'__PAYLOAD_BELOW__'
].join('\n') + '\n';
const runPath = path.join(DIST, `v6edge-${VER}.run`);
fs.writeFileSync(runPath, Buffer.concat([Buffer.from(runHeader, 'utf8'), payload]));
fs.chmodSync(runPath, 0o755);
console.log('built', runPath, (fs.statSync(runPath).size / 1024).toFixed(1) + ' KB');

/* ---------- ipk（24.x） ---------- */
function tarHeader(name, size, mode, type) {
	const b = Buffer.alloc(512, 0);
	const oct = (n, len) => n.toString(8).padStart(len - 1, '0') + '\0';
	b.write(name, 0, 100, 'utf8');
	b.write(oct(mode, 8), 100, 8);
	b.write(oct(0, 8), 108, 8);
	b.write(oct(0, 8), 116, 8);
	b.write(oct(size, 12), 124, 12);
	b.write(oct(Math.floor(Date.now() / 1000), 12), 136, 12);
	b.write('        ', 148, 8);
	b.write(type || '0', 156, 1);
	b.write('ustar', 257, 6);
	b.write('00', 263, 2);
	let sum = 0;
	for (let i = 0; i < 512; i++) sum += b[i];
	b.write(oct(sum, 7) + ' ', 148, 8);
	return b;
}

function tar(entries) {
	const parts = [];
	for (const e of entries) {
		const data = e.data ? Buffer.from(e.data) : fs.readFileSync(e.src);
		parts.push(tarHeader(e.name, data.length, e.mode || 0o644, '0'));
		parts.push(data);
		const pad = (512 - (data.length % 512)) % 512;
		if (pad) parts.push(Buffer.alloc(pad, 0));
	}
	parts.push(Buffer.alloc(1024, 0));
	return Buffer.concat(parts);
}

function arMember(name, data) {
	const h = Buffer.alloc(60, 0x20);
	h.write(name, 0, 16, 'utf8');
	h.write(String(Math.floor(Date.now() / 1000)).padEnd(12), 16, 12, 'utf8');
	h.write('0'.padEnd(6), 28, 6, 'utf8');
	h.write('0'.padEnd(6), 34, 6, 'utf8');
	h.write('100644'.padEnd(8), 40, 8, 'utf8');
	h.write(String(data.length).padEnd(10), 48, 10, 'utf8');
	h.write('`\n', 58, 2, 'latin1');
	const pad = data.length % 2 ? Buffer.from('\n') : Buffer.alloc(0);
	return Buffer.concat([h, data, pad]);
}

function buildIpk(file, pkgName, desc, deps, files, postinst) {
	const size = files.reduce((s, [, src]) => s + fs.statSync(src).size, 0);
	const control = [
		'Package: ' + pkgName,
		'Version: ' + VER,
		'Depends: ' + deps,
		'Source: https://github.com/keduoli-lovely/v6edge',
		'SourceName: ' + pkgName,
		'License: MIT',
		'Section: net',
		'SourceDateEpoch: ' + Math.floor(Date.now() / 1000),
		'Architecture: all',
		'Installed-Size: ' + size,
		'Description: ' + desc,
		''
	].join('\n');
	const ctrlEntries = [{ name: './control', data: control, mode: 0o644 }];
	if (postinst) ctrlEntries.push({ name: './postinst', data: postinst, mode: 0o755 });
	const dataEntries = files.map(([rel, src, mode]) => ({ name: './' + rel, src, mode }));
	const out = Buffer.concat([
		Buffer.from('!<arch>\n', 'latin1'),
		arMember('debian-binary', Buffer.from('2.0\n')),
		arMember('control.tar.gz', zlib.gzipSync(tar(ctrlEntries))),
		arMember('data.tar.gz', zlib.gzipSync(tar(dataEntries)))
	]);
	fs.writeFileSync(file, out);
	console.log('built', file, (fs.statSync(file).size / 1024).toFixed(1) + ' KB');
}

buildIpk(
	path.join(DIST, `v6edge_${VER}-24_all.ipk`),
	'v6edge',
	'Cloudflare edge helper (AAAA + Let\'s Encrypt + nginx TLS, IPv6 only)',
	'curl, ca-bundle, openssl-util',
	CORE,
	'#!/bin/sh\n[ -f /etc/config/v6edge ] || { cp -f /usr/share/v6edge/defaults/v6edge /etc/config/v6edge; chmod 600 /etc/config/v6edge; }\nmkdir -p /etc/v6edge/certs /etc/v6edge/acme\nexit 0\n'
);

buildIpk(
	path.join(DIST, `luci-app-v6edge_${VER}-24_all.ipk`),
	'luci-app-v6edge',
	'LuCI app for v6edge',
	'v6edge, luci-base',
	LUCI,
	'#!/bin/sh\nrm -f /tmp/luci-indexcache* 2>/dev/null\n/etc/init.d/rpcd restart >/dev/null 2>&1\nexit 0\n'
);
