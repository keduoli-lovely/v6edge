'use strict';
'require view';
'require fs';
'require ui';

var V6EDGE = '/usr/bin/v6edge';

/* ---------------- 通用 ---------------- */

function run(args) {
	return fs.exec(V6EDGE, args).catch(function (e) {
		return { code: -1, stdout: '', stderr: String(e) };
	});
}

function notify(text, type, secs) {
	var cd = E('span', { 'style': 'opacity:.7;margin-left:6px' }, '');
	var body = E('p', {}, [E('span', {}, text), cd]);
	ui.addNotification(null, body, type || 'info');
	var left = secs || 5;
	window.setTimeout(function () {
		var el = body.closest ? body.closest('.alert') : null;
		if (!el) el = body.parentElement;
		var n = left;
		cd.textContent = '（' + n + ' 秒后自动关闭）';
		var t = window.setInterval(function () {
			n--;
			cd.textContent = n > 0 ? ('（' + n + ' 秒后自动关闭）') : '';
			if (n <= 0) {
				window.clearInterval(t);
				if (el && el.parentElement) el.parentElement.removeChild(el);
			}
		}, 1000);
	}, 50);
}

function act(args, okMsg) {
	return run(args).then(function (res) {
		if (res.code !== 0) {
			notify((res.stdout || '') + (res.stderr || '执行失败'), 'danger', 8);
			return;
		}
		notify(okMsg || '完成', 'info');
		run(['doctor', '--save']).then(function () {
			if (window.__v6edge_refresh) window.__v6edge_refresh();
			else window.setTimeout(function () { location.reload(); }, 900);
		});
	});
}

/* 帮助气泡：PC 悬停 + 移动端点按 */
function installTipCss() {
	if (document.getElementById('cf-tip-css')) return;
	document.head.appendChild(E('style', { 'id': 'cf-tip-css' }, [
		'.cf-tip{display:inline-block;margin-left:6px;width:16px;height:16px;line-height:16px;',
		'text-align:center;border-radius:50%;border:1px solid #999;color:#777;font-size:12px;',
		'font-weight:normal;cursor:help;vertical-align:middle;user-select:none}',
		'.cf-tip:hover{border-color:#2b6cb0;color:#2b6cb0}',
		'#cf-tip-bubble{position:fixed;z-index:4000;display:none;box-sizing:border-box;',
		'padding:8px 10px;border-radius:6px;background:#1f2d3d;color:#fff;font-size:12px;',
		'line-height:1.55;font-weight:normal;white-space:normal;text-align:left;',
		'box-shadow:0 6px 18px rgba(0,0,0,.45);max-width:90vw}'
	].join('')));
}

function tipBubble() {
	var b = document.getElementById('cf-tip-bubble');
	if (!b) { b = E('div', { 'id': 'cf-tip-bubble' }); document.body.appendChild(b); }
	return b;
}

function showTip(el, text) {
	var b = tipBubble();
	b.textContent = text;
	b.style.display = 'block';
	var r = el.getBoundingClientRect();
	var bw = Math.min(320, Math.floor(window.innerWidth * 0.9));
	b.style.width = bw + 'px';
	var left = r.left + r.width / 2 - bw / 2;
	left = Math.max(8, Math.min(left, window.innerWidth - bw - 8));
	b.style.left = left + 'px';
	var bh = b.offsetHeight;
	var top = r.top - bh - 8;
	if (top < 8) top = r.bottom + 8;
	b.style.top = top + 'px';
}

function hideTip() {
	var b = document.getElementById('cf-tip-bubble');
	if (b) b.style.display = 'none';
}

function tip(text) {
	installTipCss();
	if (!window.__v6edge_tip_closer) {
		window.__v6edge_tip_closer = true;
		document.addEventListener('click', hideTip);
		window.addEventListener('scroll', hideTip, true);
	}
	var el = E('span', { 'class': 'cf-tip', 'role': 'button', 'tabindex': '0' }, '?');
	el.addEventListener('mouseenter', function () { showTip(el, text); });
	el.addEventListener('mouseleave', hideTip);
	el.addEventListener('click', function (ev) { ev.stopPropagation(); showTip(el, text); });
	el.addEventListener('blur', hideTip);
	el.addEventListener('keydown', function (ev) {
		if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); showTip(el, text); }
	});
	return el;
}

function installLayoutCss() {
	if (document.getElementById('cf-layout-css')) return;
	document.head.appendChild(E('style', { 'id': 'cf-layout-css' }, [
		'.cf-page{padding:0}',
		'.cf-col{margin:0 !important;padding:1.25rem !important;display:flex;flex-direction:column;flex:1;min-width:0}',
		'.cf-col>h3{margin:0 0 10px 0 !important;padding:0 !important;background:none !important;border:0 !important;font-size:1.05rem}',
		'.cf-row.cbi-value{display:grid !important;grid-template-columns:88px minmax(0,1fr);gap:8px;align-items:center;flex-wrap:nowrap !important;margin:0 0 10px 0;padding:0}',
		'.cf-row.cbi-value>label.cbi-value-title{width:auto !important;max-width:none;flex:none;margin:0;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#888;font-weight:normal}',
		'.cf-row.cbi-value>.cbi-value-field{margin:0 !important;padding:0 !important;min-width:0;display:flex;align-items:center;gap:6px;flex-wrap:wrap;overflow:visible}',
		'.cf-row.cbi-value .cbi-value-field>input[type=text],.cf-row.cbi-value .cbi-value-field>input[type=password],.cf-row.cbi-value .cbi-value-field>select{flex:1;min-width:110px;box-sizing:border-box}',
		'.cf-val{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
		'.cf-kv{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
		'.cf-hint{color:#888;white-space:nowrap}',
		'.cf-kvrow{display:grid;grid-template-columns:88px minmax(0,1fr);gap:8px;align-items:center;margin:6px 0}',
		'.cf-kvrow>span:first-child{color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
		'.cf-kvrow3{display:grid;grid-template-columns:88px minmax(0,1fr) auto;gap:8px;align-items:center;margin:6px 0}',
		'.cf-kvrow3>span:first-child{color:#888;white-space:nowrap}',
		'.cf-kvrow4{display:grid;grid-template-columns:88px minmax(0,1fr) auto auto;gap:8px;align-items:center;margin:6px 0}',
		'.cf-kvrow4>span:first-child{color:#888;white-space:nowrap}',
		'.cf-divider{margin:16px 0 12px 0;border-top:1px solid rgba(128,128,128,.35);padding-top:12px}',
		'.cf-inline{display:flex;align-items:center;gap:8px;flex:1;min-width:0;flex-wrap:wrap}',
		'.cf-inline>input[type=text]{flex:1;min-width:110px;box-sizing:border-box}',
		'.cf-ag{display:flex;flex-direction:column;gap:8px;width:100%}',
		'.cf-ag .cf-line{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;width:100%}',
		'.cf-ag .cf-line>input{min-width:0;box-sizing:border-box;height:32px}',
		'.cf-ag .cf-line>input:first-child{flex:2 1 0}',
		'.cf-ag .cf-line>input+input{flex:1 1 0}',
		'.cf-eye{flex:0 0 34px !important;width:34px !important;padding:0 !important;height:32px;line-height:32px;text-align:center}',
		'.cf-opts{display:flex;flex-wrap:wrap;gap:10px 22px;overflow:visible;padding-left:2px}',
		'.cf-opts .cf-opt{flex:0 0 auto}',
		'.cf-opt{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;margin:0;text-align:left}',
		'.cf-opt input[type=checkbox]{width:15px;height:15px;min-width:15px;margin:0;flex:0 0 auto;position:static}',
		'.cf-actions{align-items:center}',
		'.cf-actions .cbi-button{min-height:32px;display:inline-flex;align-items:center;justify-content:center;line-height:1.2}',
		'.cf-actions .cbi-button:disabled{opacity:.55;cursor:not-allowed}',
		'.cf-modal .cf-actions{padding:0;margin:0}',
		'button:disabled{opacity:.55;cursor:not-allowed}',
		'.cf-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:14px;font-size:13px;font-weight:bold}',
		'.cf-badge.ok{background:#e6f5ea;color:#1e7b34}',
		'.cf-badge.warn{background:#fff4e0;color:#9a6400}',
		'.cf-badge.fail{background:#fde8e8;color:#b3261e}',
		'.cf-doc-list{margin:10px 0 0 0;padding-left:1.25rem;font-size:13px;line-height:1.7}',
		'.cf-ok{color:#1e7b34}',
		'.cf-bad{color:#b3261e}',
		'.modal-dialog:has(> .cf-modal){width:auto !important;min-width:0 !important;max-width:96vw !important}',
		'@media (max-width:600px){.cf-row.cbi-value{display:block}.cf-row.cbi-value>label.cbi-value-title{display:block;margin:0 0 5px 0}}'
	].join('')));
}

function row(label, control, helpText, hint) {
	var val = (typeof control === 'string') ? E('span', { 'class': 'cf-val' }, control) : control;
	return E('div', { 'class': 'cbi-value cf-row' }, [
		E('label', { 'class': 'cbi-value-title' }, label),
		E('div', { 'class': 'cbi-value-field' }, [
			val,
			helpText ? tip(helpText) : '',
			hint ? E('span', { 'class': 'cf-hint' }, hint) : ''
		])
	]);
}

function eyeToggle(input) {
	var btn = E('button', { 'type': 'button',
		'class': 'cbi-button cf-eye',
		'title': '显示 / 隐藏'
	}, '👁');
	btn.addEventListener('click', function (ev) {
		ev.preventDefault();
		input.type = (input.type === 'password') ? 'text' : 'password';
	});
	return btn;
}

function textInput(value, placeholder) {
	return E('input', { 'type': 'text', 'value': value || '', 'placeholder': placeholder || '' });
}

function checkbox(on) {
	var el = E('input', { 'type': 'checkbox' });
	if (on === true || on === 1 || on === '1') el.checked = true;
	return el;
}

function optBox(cb, label, helpText) {
	return E('label', { 'class': 'cf-opt' }, [cb, E('span', {}, label), helpText ? tip(helpText) : '']);
}

var HELP = {
	lan: '只允许局域网访问（allow 私网段 + deny all），不开放公网端口。适合 DSM、路由器后台、Portainer、qBittorrent WebUI 这类不该暴露到公网的管理面板。',
	large: '关闭 nginx 的请求/响应缓冲、解除上传大小限制、不落盘缓存。照片、视频、Jellyfin/Emby、下载站、网盘、大文件上传下载时勾选。',
	tls: '内网服务本身走 https 时勾选。默认不勾：浏览器里用 http://IP:端口 能打开的服务，就不要勾。',
	ws: '需要 WebSocket 的服务（Jellyfin/Emby 播放状态、部分管理面板、聊天类）。默认勾选，勾了没有副作用。',
	port: '留空或填 edge 表示使用「统一边缘端口」（见基础设置）。也可以填独立端口，比如 8096；独立端口会单独加防火墙规则。',
	target: '服务的局域网地址，必须带协议，形如 http://192.168.1.10:8080 或 https://...。' +
		'协议决定反代用 http 还是 https；离开输入框会自动探测一次是否可达。',
	name: '只填前缀，比如 jellyfin 就是 jellyfin.你的域名。',
	deny: '把该路径的 POST 直接返回 403。用来在公网关掉密码登录接口，例如 Immich 填 /api/auth/login，公网就只能走 OAuth。',
	zone: 'Cloudflare 上托管的根域名（zone），例如 example.com。',
	edge: '统一入口端口：服务端口填 edge 时都用它，由 nginx 监听、按域名(SNI)分流到内网，防火墙只需开这一个口。别用 80/443（LuCI 占用且运营商常封）。',
	certmode: '通配符：一张 *.你的域名 证书覆盖所有子域，加服务不用重签（推荐）。逐域名：每个域名单独签。',
	token: 'Cloudflare API Token。最小权限：Zone:Zone:Read + Zone:DNS:Edit，Zone Resources 只选本域名。留空表示保留现有 token。',
	provider: 'DNS 托管在谁那里。Cloudflare 用 API Token；阿里云 DNS 用 RAM 子账号的 AccessKey（建议只授 AliyunDNSFullAccess 并绑定 IP 白名单）。',
	ali: '阿里云 RAM 子账号的 AccessKey ID / Secret。切勿用主账号；可只授予目标域名的 DNS 解析权限。',
	interval: 'DDNS 检查间隔（分钟）。运营商换 IPv6 前缀后，最多这么久会更新所有 AAAA。',
	extra: '除了服务域名，额外维护的 AAAA 记录，逗号分隔，例如 cam.example.com,ha.example.com。'
};

/* ---------------- 视图 ---------------- */

return view.extend({
	load: function () {
		return run(['status', '--json']).then(function (res) {
			try { return JSON.parse(res.stdout || '{}'); }
			catch (e) { return { error: (res.stdout || '') + (res.stderr || '') }; }
		});
	},

	render: function (st) {
		installLayoutCss();
		var s = st || {};
		var self = this;

		function softRefresh() {
			run(['status', '--json']).then(function (res) {
				var d;
				try { d = JSON.parse(res.stdout || '{}'); } catch (e) { location.reload(); return; }
				var old = document.querySelector('.cf-page');
				if (old) old.replaceWith(self.render(d)); else location.reload();
			});
		}
		window.__v6edge_refresh = softRefresh;

		var zoneProvAddSel = E('select', {}, [
			E('option', { 'value': 'cloudflare' }, 'Cloudflare'),
			E('option', { 'value': 'aliyun' }, '阿里云')
		]);

		function addZoneModal(prov) {
			var nameIn = textInput('', 'example.com');
			var tokIn = E('input', { 'type': 'password', 'placeholder': 'Cloudflare API Token' });
			var akIn = textInput('', 'AccessKey ID');
			var skIn = E('input', { 'type': 'password', 'placeholder': 'AccessKey Secret' });
			var isAli = prov === 'aliyun';
			var rows = [
				row('域名', nameIn, '完整域名，例如 example.com'),
				isAli ? row('AccessKey ID', akIn) : row('API Token', E('div', { 'class': 'cf-inline' }, [tokIn, eyeToggle(tokIn)]))
			];
			if (isAli) rows.push(row('AccessKey Secret', E('div', { 'class': 'cf-inline' }, [skIn, eyeToggle(skIn)])));
			ui.showModal('添加域名（' + (isAli ? '阿里云 DNS' : 'Cloudflare') + '）', [
				E('div', { 'class': 'cbi-map cf-modal', 'style': 'width:380px;max-width:92vw' }, rows),
				E('div', { 'class': 'right', 'style': 'margin-top:12px' }, [
					E('button', { 'type': 'button', 'class': 'btn', 'click': ui.hideModal }, '取消'), ' ',
					E('button', { 'type': 'button', 'class': 'cbi-button cbi-button-apply', 'click': function () {
						var n = (nameIn.value || '').trim();
						if (n.indexOf('.') < 0 || !/^[A-Za-z0-9.-]+$/.test(n)) { alert('请填完整域名，例如 example.com'); return; }
						var args = ['zone', 'add', n, '--provider', prov];
						if (isAli) {
							if (!(akIn.value || '').trim() || !(skIn.value || '').trim()) { alert('阿里云需要 AccessKey ID 与 Secret'); return; }
							args.push('--ali-key', akIn.value.trim(), '--ali-secret', skIn.value.trim());
						} else {
							if (!(tokIn.value || '').trim()) { alert('请填写 Cloudflare API Token'); return; }
							args.push('--token', tokIn.value.trim());
						}
						ui.hideModal();
						act(args, '域名已添加：' + n);
					}}, '验证并添加')
				])
			]);
		}
		var svcs = s.services || [];
		var doc = s.doctor || null;

		function actionButton(label, args, confirmMsg) {
			return E('button', { 'type': 'button',
				'class': 'cbi-button cbi-button-apply',
				'click': function () {
					if (confirmMsg && !confirm(confirmMsg)) return;
					act(args);
				}
			}, label);
		}

				/* ---- 弹窗：配置凭据 ---- */
		function credModal(z) {
			var isAli = z.provider === 'aliyun';
			var tokIn = E('input', { 'type': 'password', 'placeholder': '新的 API Token' });
			var akIn = textInput('', 'AccessKey ID');
			var skIn = E('input', { 'type': 'password', 'placeholder': 'AccessKey Secret' });
			var rows = [
				row('域名', E('span', {}, z.name)),
				row('当前凭据', E('span', {}, z.cred ? (z.cred + ' ' + (z.masked || '')) : '未配置'))
			];
			if (isAli) {
				rows.push(row('AccessKey ID', akIn));
				rows.push(row('AccessKey Secret', E('div', { 'class': 'cf-inline' }, [skIn, eyeToggle(skIn)])));
			} else {
				rows.push(row('新 Token', E('div', { 'class': 'cf-inline' }, [tokIn, eyeToggle(tokIn)])));
			}
			ui.showModal('配置凭据 · ' + z.name, [
				E('div', { 'class': 'cbi-map cf-modal', 'style': 'width:380px;max-width:92vw' }, rows),
				E('div', { 'class': 'right', 'style': 'margin-top:12px' }, [
					E('button', { 'type': 'button', 'class': 'btn', 'click': ui.hideModal }, '取消'), ' ',
					E('button', { 'type': 'button', 'class': 'cbi-button cbi-button-apply', 'click': function () {
						var secret = isAli ? ((akIn.value || '').trim() + ':' + (skIn.value || '').trim()) : (tokIn.value || '').trim();
						if (!isAli && !(tokIn.value || '').trim()) { alert('请填写新的 API Token'); return; }
						if (isAli && (!(akIn.value || '').trim() || !(skIn.value || '').trim())) { alert('阿里云需要 AccessKey ID 与 Secret'); return; }
						ui.hideModal();
						run(['cred', 'add', z.provider, secret]).then(function (res) {
							var id = (res.stdout || '').trim().split('\n').pop();
							if (!id) { notify(res.stderr || '创建凭据失败', 'danger', 8); return; }
							run(['zone', 'set-cred', z.name, id]).then(function () {
								notify('凭据已更新并绑定到 ' + z.name, 'info');
								run(['doctor', '--save']).then(function () { if (window.__v6edge_refresh) window.__v6edge_refresh(); });
							});
						});
					}}, '保存')
				])
			]);
		}

/* ---- 弹窗：新增服务 ---- */
		function addServiceModal() {
			// 前置检查：根域名 / API Token
			if (!s.zone) {
				notify('还没有配置根域名（Cloudflare zone），先完成基础设置', 'warning', 6);
				return settingsModal();
			}
			if (s.has_token === false) {
				notify('还没有配置 Cloudflare API Token，先完成基础设置', 'warning', 6);
				return settingsModal();
			}
			var nameIn = textInput('', 'jellyfin');
			var zoneSel2 = E('select', {}, (s.zones || []).map(function (z) {
				return E('option', { 'value': z.name }, z.name);
			}));
			zoneSel2.value = (s.zone || (s.zones && s.zones[0] && s.zones[0].name) || '');
			var targetIn = textInput('', 'http://192.168.1.10:8096');
			var portIn = textInput('', 'edge');
			var denyIn = textInput('', '/api/auth/login');
			var probe = E('span', { 'class': 'cf-hint' }, '');
			var lanCb = checkbox(false), largeCb = checkbox(false), wsCb = checkbox(true);

			function probeTarget(input, out) {
				var v = (input.value || '').trim();
				out.className = 'cf-hint';
				if (!/^https?:\/\//.test(v)) { out.textContent = ''; return; }
				out.textContent = '检测中…';
				run(['check', v]).then(function (res) {
					var txt = ((res.stdout || '') + (res.stderr || '')).trim();
					out.textContent = txt;
					out.className = 'cf-hint ' + (res.code === 0 ? 'cf-ok' : 'cf-bad');
				});
			}

			targetIn.addEventListener('blur', function () { probeTarget(targetIn, probe); });

			ui.showModal('新增服务', [
				E('div', { 'class': 'cbi-map cf-modal', 'style': 'width:380px;max-width:92vw' }, [
					(s.landns === 'external' ? E('div', {
						'style': 'margin:0 0 10px 0;padding:8px 10px;border-radius:6px;background:#fff4e0;color:#7a4a00;font-size:12px;line-height:1.5'
					}, '局域网 DNS 不受 v6edge 控制。若你使用 AdGuard Home，请到「基础设置」配置 AdGuard，否则新域名在局域网可能无法解析。') : ''),
					row('子域名', nameIn, HELP.name),
					row('域名', zoneSel2, '服务挂在哪个根域名下（CF/阿里云上配置的 zone）。'),
					row('内网目标', E('div', { 'class': 'cf-inline' }, [targetIn, probe]), HELP.target),
					row('公网端口', portIn, HELP.port, '留空=edge'),
					row('禁止 POST', denyIn, HELP.deny),
					row('选项', E('div', { 'class': 'cf-opts' }, [
						optBox(lanCb, '仅内网', HELP.lan),
						optBox(largeCb, '大文件（媒体）', HELP.large),
						optBox(wsCb, 'WebSocket', HELP.ws)
					]))
				]),
				E('div', { 'class': 'right', 'style': 'margin-top:12px' }, [
					E('button', { 'type': 'button', 'class': 'btn', 'click': ui.hideModal }, '取消'), ' ',
					' ',
					E('button', { 'type': 'button',
						'class': 'cbi-button cbi-button-apply',
						'click': function () {
							var n = nameIn.value.trim(), t = targetIn.value.trim();
							if (!/^[a-z0-9-]+$/.test(n)) { alert('子域名只能用小写字母/数字/中划线'); return; }
							if (!/^https?:\/\//.test(t)) { alert('内网目标必须以 http:// 或 https:// 开头'); return; }
							var args = ['add', n, t, (portIn.value.trim() || 'edge'), '--zone', zoneSel2.value];
							if (lanCb.checked) args.push('--lan-only');
							if (largeCb.checked) args.push('--large');
							if (!wsCb.checked) args.push('--no-ws');
							if (denyIn.value.trim()) args.push('--deny-post', denyIn.value.trim());
							ui.hideModal();
							act(args, '已添加 ' + n);
						}
					}, '添加并发布')
				])
			]);
		}

		/* ---- 弹窗：编辑服务 ---- */
		function editService(v) {
			var port = textInput(v.port, 'edge 或端口号');
			var target = textInput(v.target, 'http://192.168.1.10:8080');
			var probe = E('span', { 'class': 'cf-hint' }, '');
			var lan = checkbox(v.lan_only), large = checkbox(v.large);
			var ws = checkbox(v.ws !== false);

			target.addEventListener('blur', function () {
				var t = (target.value || '').trim();
				probe.className = 'cf-hint';
				if (!/^https?:\/\//.test(t)) { probe.textContent = ''; return; }
				probe.textContent = '检测中…';
				run(['check', t]).then(function (res) {
					var txt = ((res.stdout || '') + (res.stderr || '')).trim();
					probe.textContent = txt;
					probe.className = 'cf-hint ' + (res.code === 0 ? 'cf-ok' : 'cf-bad');
				});
			});

			ui.showModal('编辑 ' + v.name + '（' + v.fqdn + '）', [
				E('div', { 'class': 'cbi-map cf-modal', 'style': 'width:380px;max-width:92vw' }, [
					row('公网端口', port, HELP.port),
					row('内网目标', E('div', { 'class': 'cf-inline' }, [target, probe]), HELP.target),
					row('选项', E('div', { 'class': 'cf-opts' }, [
						optBox(lan, '仅内网', HELP.lan),
						optBox(large, '大文件（媒体）', HELP.large),
						optBox(ws, 'WebSocket', HELP.ws)
					]))
				]),
				E('div', { 'class': 'right', 'style': 'margin-top:12px' }, [
					E('button', { 'type': 'button', 'class': 'btn', 'click': ui.hideModal }, '取消'), ' ',
					E('button', { 'type': 'button',
						'class': 'cbi-button cbi-button-apply',
						'click': function () {
							var t = (target.value || '').trim();
							if (!/^https?:\/\//.test(t)) { alert('内网目标必须以 http:// 或 https:// 开头'); return; }
							var args = ['set', v.name,
								'--port', (port.value || '').trim() || v.port,
								'--target', t,
								'--lan-only', lan.checked ? '1' : '0',
								'--large', large.checked ? '1' : '0',
								'--ws', ws.checked ? '1' : '0'];
							ui.hideModal();
							act(args, '已更新 ' + v.name);
						}
					}, '保存')
				])
			]);
		}

/* ---- 弹窗：DDNS ---- */
		function ddnsModal() {
			var intervalIn = textInput(s.ddns_interval || '10', '10');
			var extraIn = textInput(s.extra || '', 'a.example.com,b.example.com');
			ui.showModal('DDNS 设置', [
				E('div', { 'class': 'cbi-map cf-modal', 'style': 'width:360px;max-width:92vw' }, [
					row('同步间隔', E('div', { 'class': 'cf-inline' }, [
						intervalIn,
						E('button', { 'type': 'button',
							'class': 'cbi-button cbi-button-apply',
							'click': function () {
								var v = (intervalIn.value || '').trim();
								if (!/^[0-9]+$/.test(v)) { alert('请填数字'); return; }
								act(['ddns', 'interval', v], '间隔已改为 ' + v + ' 分钟');
							}
						}, '保存')
					]), HELP.interval),
					row('额外域名', E('div', { 'class': 'cf-inline' }, [
						extraIn,
						E('button', { 'type': 'button',
							'class': 'cbi-button cbi-button-apply',
							'click': function () {
								act(['ddns', 'set-extra', (extraIn.value || '').trim()], '列表已保存');
							}
						}, '保存')
					]), HELP.extra),
					row('当前状态', E('span', {}, (s.ddns_enabled ? '定时同步已启用' : '定时同步已停用') +
						'，上次同步 ' + (s.last_ip || '从未'))),
					row('操作', E('div', { 'class': 'cf-actions' }, [
						E('button', { 'type': 'button', 'class': 'cbi-button', 'click': function () {
							ui.hideModal(); act(['ddns', 'sync'], '已同步');
						} }, '立即同步'),
						E('button', { 'type': 'button', 'class': 'cbi-button', 'click': function () {
							ui.hideModal(); act(['ddns', s.ddns_enabled ? 'disable' : 'enable'],
								s.ddns_enabled ? '已停用' : '已启用');
						} }, s.ddns_enabled ? '停用定时同步' : '启用定时同步')
					]))
				]),
				E('div', { 'class': 'right', 'style': 'margin-top:12px' }, [
					E('button', { 'type': 'button', 'class': 'btn', 'click': ui.hideModal }, '关闭')
				])
			]);
		}

		/* ---- 弹窗：基础设置 ---- */
		function settingsModal() {
			var agUrlIn = textInput(s.ag_url || 'http://192.168.1.2:3000', 'http://IP:3000');
			var agUserIn = textInput('', '用户名');
			var agPassIn = E('input', { 'type': 'password', 'placeholder': '密码' });
			run(['adguard', 'show']).then(function (res) {
				var p = (res.stdout || '').trim().split('|');
				if (p.length >= 3) {
					if (p[0]) agUrlIn.value = p[0];
					agUserIn.value = p[1] || agUserIn.value;
					agPassIn.value = p[2] || '';
				}
			});
			ui.showModal('AdGuard 配置', [
				E('div', { 'class': 'cbi-map cf-modal', 'style': 'width:380px;max-width:92vw' }, [
					E('div', {
						'style': 'margin:0 0 10px 0;padding:8px 10px;border-radius:6px;background:#fff4e0;color:#7a4a00;font-size:12px;line-height:1.5'
					}, '仅在「局域网 DNS 由 AdGuard Home 接管」时才需要配置。路由器的 dnsmasq 或公共 DNS 模式下无需填写。'),
					row('管理地址', agUrlIn, 'AdGuard 的 Web 管理地址，含端口，例如 http://192.168.1.2:3000'),
					row('用户名', agUserIn, 'AdGuard 初始化时设置的用户名（不是 admin）'),
					row('密码', E('div', { 'class': 'cf-inline' }, [agPassIn, eyeToggle(agPassIn)])),
					row('当前模式', s.landns === 'adguard' ? 'AdGuard 已接管' : (s.landns === 'router' ? '路由器 dnsmasq（无需 AdGuard）' : '外部 DNS（AdGuard 未接管）'))
				]),
				E('div', { 'class': 'right', 'style': 'margin-top:12px' }, [
					E('button', { 'type': 'button', 'class': 'btn', 'click': ui.hideModal }, '关闭'),' ',
					E('button', { 'type': 'button', 'class': 'cbi-button', 'click': function () {
						ui.hideModal(); act(['adguard', 'sync'], '局域网 DNS 已同步');
					}}, '同步重写'),' ',
					E('button', { 'type': 'button', 'class': 'cbi-button cbi-button-apply', 'click': function () {
						ui.hideModal();
						act(['adguard', 'login', (agUrlIn.value || '').trim(), (agUserIn.value || '').trim(), (agPassIn.value || '')], 'AdGuard 已连接');
					}}, '连接')
				])
			]);
		}

/* ---- 服务表 ---- */
		var rows = svcs.map(function (v) {
			return E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td' }, v.name),
				E('td', { 'class': 'td' }, v.fqdn),
				E('td', { 'class': 'td' }, v.port),
				E('td', { 'class': 'td' }, v.target),
				E('td', { 'class': 'td' }, v.lan_only ? '仅内网' : '公网'),
				E('td', { 'class': 'td' }, v.large ? '大文件' : '普通'),
				E('td', { 'class': 'td' }, [
					E('a', {
						'href': 'https://' + v.fqdn + ':' + v.port + '/',
						'target': '_blank',
						'rel': 'noopener',
						'class': 'cbi-button cbi-button-action'
					}, '打开')
				]),
				E('td', { 'class': 'td' }, [
					E('button', { 'type': 'button', 'class': 'cbi-button cbi-button-action',
						'click': function () { editService(v); } }, '编辑'), ' ',
					E('button', { 'type': 'button', 'class': 'cbi-button cbi-button-remove',
						'click': function () {
							if (!confirm('删除服务 ' + v.name + ' 并回滚 nginx/防火墙/DNS？')) return;
							act(['rm', v.name]);
						} }, '删除')
				])
			]);
		});

		/* ---- 自检状态 ---- */
		var badge = E('span', { 'class': 'cf-badge ok' }, '尚未检查');
		var docList = E('ul', { 'class': 'cf-doc-list' });
		if (doc) {
			var lvl = (doc.fail > 0) ? 'fail' : (doc.warn > 0 ? 'warn' : 'ok');
			badge.className = 'cf-badge ' + lvl;
			badge.textContent = (lvl === 'ok' ? '✓ 全部正常' :
				(lvl === 'warn' ? '⚠ ' + doc.warn + ' 项提醒' : '✗ ' + doc.fail + ' 项失败')) +
				'（' + (doc.time || '') + '）';
			(doc.items || []).forEach(function (it) {
				if (it.l === 'ok') return;
				docList.appendChild(E('li', { 'class': it.l }, (it.l === 'fail' ? '[失败] ' : '[提醒] ') + it.t));
			});
		}

/* 域名面板（右侧） */
			/* 三列：状态 / 域名 / 证书+边缘 */
			function statusSection() {
				return E('div', { 'class': 'cbi-section cf-col', 'style': 'flex:1 1 320px;min-width:300px' }, [
					E('h3', {}, '状态'),
					row('域名', (s.zone || '—') + '  ·  边缘端口 ' + (s.edge_port || '—')),
					row('公网 IPv6', s.ipv6_ok ? ('✓ ' + (s.ipv6 || '')) : ('✗ 不可用（' + (s.ipv6_reason || 'no-addr') + '）')),
					row('DDNS', (s.ddns_enabled ? '每 ' + s.ddns_interval + ' 分钟' : '已停用') + '，上次 ' + (s.last_ip || '从未')),
					row('局域网 DNS', s.landns === 'router' ? '路由器 dnsmasq 泛解析' :
						(s.landns === 'adguard' ? 'AdGuard 重写' : '外部 DNS（需手动加解析）')),
					row('自检', badge),
					docList,
					E('div', { 'style': 'margin-top:auto;padding-top:12px;display:flex;gap:8px;flex-wrap:wrap' }, [
						E('button', { 'type': 'button', 'class': 'cbi-button cbi-button-apply', 'click': addServiceModal }, '+ 新增服务'),
						E('button', { 'type': 'button', 'class': 'cbi-button', 'click': ddnsModal }, 'DDNS 设置'),
						E('button', { 'type': 'button', 'class': 'cbi-button', 'click': settingsModal }, 'AdGuard 配置'),
						E('button', { 'type': 'button', 'class': 'cbi-button', 'click': function () { act(['doctor', '--save'], '自检完成'); } }, '立即自检')
					])
				]);
			}

			function zonesSection() {
				var zs = s.zones || [];
				var sel = E('select', {}, zs.map(function (z) { return E('option', { 'value': z.name }, z.name); }));
				sel.value = (s.zone || (zs[0] && zs[0].name) || '');
				var body = E('div', { 'class': 'cf-ag', 'style': 'flex:1' });
				function render() {
					body.innerHTML = '';
					var z = zs.filter(function (x) { return x.name === sel.value; })[0];
					if (!z) { body.appendChild(E('p', {}, '还没有域名，在下面添加')); return; }
					function kv(k, v) {
						return E('div', { 'class': 'cf-kvrow' }, [
							E('span', {}, k),
							E('span', { 'class': 'cf-kv' }, v)
						]);
					}
					body.appendChild(kv('提供商', z.provider));
					body.appendChild(E('div', { 'class': 'cf-kvrow3' }, [
						E('span', {}, '凭据'),
						E('span', { 'class': 'cf-kv' }, z.cred ? (z.cred + ' ' + (z.masked || '')) : '未配置'),
						E('button', { 'type': 'button', 'class': 'cbi-button', 'click': function () { credModal(z); } }, '配置凭据')
					]));
					body.appendChild(kv('服务', String(z.services) + (z.svc_names ? '：' + z.svc_names : '')));
					body.appendChild(E('div', { 'class': 'cf-line', 'style': 'margin-top:10px;gap:8px;flex-wrap:wrap' }, [
						E('button', { 'type': 'button', 'class': 'cbi-button', 'style': 'margin-right:4px', 'click': function () { act(['zone', 'set-default', z.name], z.name + ' 已设为默认'); } }, '设为默认'),
						E('button', { 'type': 'button', 'class': 'cbi-button cbi-button-remove', 'click': function () {
							if (!confirm('删除域名 ' + z.name + '？凭据若只被它使用会一并删除。')) return;
							act(['zone', 'rm', z.name], '已删除 ' + z.name);
						} }, '删除域名'),
						E('button', { 'type': 'button', 'class': 'cbi-button cbi-button-remove', 'click': function () {
							if (!confirm('删除域名 ' + z.name + ' 并清除它的 ' + z.services + ' 个服务？')) return;
							act(['zone', 'rm', z.name, '--purge'], '已删除 ' + z.name + ' 及服务');
						} }, '删除域名并清除服务')
					]));
				}
				sel.addEventListener('change', render);
				render();
				return E('div', { 'class': 'cbi-section cf-col', 'style': 'flex:1 1 320px;min-width:300px' }, [
					E('h3', {}, '域名'),
					E('div', { 'class': 'cf-line', 'style': 'margin:0 0 16px 0' }, [sel]),
					body,
					E('div', { 'class': 'cf-line', 'style': 'margin-top:auto;padding-top:16px;gap:12px;flex-wrap:wrap;align-items:center' }, [
						zoneProvAddSel,
						E('button', { 'type': 'button', 'class': 'cbi-button cbi-button-apply', 'style': 'margin-left:12px', 'click': function () { addZoneModal(zoneProvAddSel.value); } }, '添加域名')
					])
				]);
			}

			function certSection() {
				var zs = s.zones || [];
				var rows = zs.map(function (z) {
					var canIssue = z.can_issue === true;
					var b = { 'type': 'button', 'class': 'cbi-button' };
					if (!canIssue) {
						b.disabled = 'disabled';
						b.title = '证书仍在有效期内，到期前 30 天或强制重签时才可签发';
					} else {
						b.click = function () { act(['cert'], '证书已处理'); };
					}
					return E('div', { 'class': 'cf-kvrow4' }, [
						E('span', {}, z.name),
						E('span', { 'class': 'cf-kv' }, z.not_after || '未签发'),
						E('button', b, canIssue ? '签发/续期' : '暂不可签发'),
						E('button', { 'type': 'button', 'class': 'cbi-button cbi-button-remove', 'click': function () {
							if (!confirm('强制重签 ' + z.name + ' 会消耗 Let\'s Encrypt 额度（同域名每周 5 张），继续？')) return;
							act(['cert', '--force'], '已强制重签');
						} }, '强制重签')
					]);
				});
				var edgeInp = textInput(s.edge_port || '8443');
				return E('div', { 'class': 'cbi-section cf-col', 'style': 'flex:1 1 320px;min-width:300px' }, [
					E('h3', {}, '证书与边缘'),
					E('div', {}, rows.length ? rows : E('p', {}, '还没有域名')),
					E('div', { 'class': 'cf-divider' }, [
						row('边缘端口', E('div', { 'class': 'cf-inline', 'style': 'gap:10px' }, [
							edgeInp,
							E('button', { 'type': 'button', 'class': 'cbi-button', 'click': function () {
								act(['init', '--zone', (s.zone || ''), '--provider', (s.provider || 'cloudflare'), '--edge-port', (edgeInp.value || '8443').trim(), '--cert-mode', (s.cert_mode || 'wildcard'), '--token', ''], '端口已保存');
							} }, '保存')
						]), HELP.edge)
					])
				]);
			}

return E('div', { 'class': 'cf-page' }, [
			E('h2', {}, 'Cloudflare 边缘管理'),
			E('p', { 'class': 'cbi-section-descr', 'style': 'padding-bottom:6px;margin-bottom:18px' },
				'把局域网服务发布到公网 IPv6：自动维护 AAAA、签发证书、生成 nginx TLS 反代。' +
				'注意：光猫的 IPv6 防火墙必须关闭/放行；80/443 常被运营商封，请用高位端口。'),

			(s.ipv6_ok ? '' : E('div', {
				'style': 'margin:0 1.25rem 12px 1.25rem;padding:12px 14px;border-radius:6px;' +
					'border-left:4px solid #b3261e;background:#fde8e8;color:#7f1d1d'
			}, [
				E('strong', {}, '未检测到公网 IPv6，v6edge 暂不可用'),
				E('ul', { 'style': 'margin:8px 0 8px 18px' }, [
					E('li', {}, '光猫/上级路由是否开启 IPv6 并下发 /64 前缀'),
					E('li', {}, 'iStoreOS 的 wan6 是否启用 DHCPv6/SLAAC'),
					E('li', {}, '运营商是否已开通 IPv6'),
					E('li', {}, '修好后点「重新检测」或运行 v6edge doctor')
				]),
				E('button', { 'type': 'button', 'class': 'cbi-button cbi-button-apply', 'click': function () {
					act(['doctor', '--save'], '已重新检测');
				} }, '重新检测')
			])),

			/* 三列布局 */
			E('div', { 'style': 'display:flex;gap:16px;flex-wrap:wrap;align-items:stretch' }, [
				statusSection(),
				zonesSection(),
				certSection()
			]),

/* 服务列表 */
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, '已发布的服务'),
				svcs.length ? E('table', { 'class': 'table' }, [
					E('tr', { 'class': 'table-titles' }, [
						E('th', { 'class': 'th' }, '名字'),
						E('th', { 'class': 'th' }, '域名'),
						E('th', { 'class': 'th' }, '端口'),
						E('th', { 'class': 'th' }, '内网目标'),
						E('th', { 'class': 'th' }, '范围'),
						E('th', { 'class': 'th' }, '模式'),
						E('th', { 'class': 'th' }, '访问'),
						E('th', { 'class': 'th' }, '操作')
					])
				].concat(rows)) : E('p', {}, '还没有服务，点上面的「+ 新增服务」。')
			])
		]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
