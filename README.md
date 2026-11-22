# v6edge

把局域网服务安全地发布到公网 **IPv6**：自动维护 Cloudflare **AAAA** 记录、用 **acme.sh DNS-01** 签发
Let's Encrypt 证书（支持通配符）、生成 **nginx TLS 反代**、开放防火墙端口，并提供自检与一键回滚。

面向 **OpenWrt / iStoreOS**（主路由场景），带 LuCI 页面。

> 中国家庭宽带普遍没有公网 IPv4，但有公网 IPv6；光猫拨号时入站被防火墙挡住是常态。
> v6edge 就是把这套「IPv6 + DDNS + 证书 + 反代」的手工流程固化下来。

## 功能

- `init` 一条命令配好 zone + Cloudflare API Token（写入 0600 文件）
- `cert` 自动签发/续期：DNS-01 不需要 80/443，通配符 `*.zone` 或逐域名两种模式
- `add` 发布服务：子域名 + 公网端口 + 内网目标，自动生成 nginx vhost（HTTP→HTTPS 301、HSTS、WebSocket、大文件流式）
- `rm` 一键回滚：删 vhost、删防火墙规则（没有别的服务用该端口时）、删 DNS 记录
- `ddns` 常驻守护：定时比对 WAN IPv6 与前缀变化，同步所有域名；支持额外域名列表
- `doctor` 自检：token/zone、WAN IPv6、端口冲突、证书覆盖、防火墙、DNS 一致性、定时任务
- LuCI 页面：状态、服务增删、证书、DDNS 列表、自检

## 依赖

`nginx-full`、`acme-acmesh`、`acme-acmesh-dnsapi`、`curl`、`ca-bundle`、`openssl-util`、`jsonfilter`

> nginx 只用于反代，不接管 80/443；LuCI 的 uhttpd 保持不动。

## 多根域名（zone）

一个 v6edge 实例可以管理多个根域名，每个 zone 记录自己的 provider 与证书模式：

```sh
v6edge zone list                 # 列出所有域名（provider / 证书模式 / 服务数）
v6edge zone discover             # 用当前凭据列出可用的域名（CF: /zones，阿里云: DescribeDomains）
v6edge zone add example.cn       # 添加（会校验域名确实在当前凭据下可用）
v6edge zone rm example.cn        # 删除（还有服务在用时会拒绝）
v6edge zone set-default example.cn
```

- 服务新增 `zone` 字段：`v6edge add nas 192.168.1.5:5000 5001 --zone example.cn`
- 证书按 zone 存放：`/etc/v6edge/certs/<zone>.crt|key`
- DDNS 按 zone 循环，每个 zone 用自己 provider 的凭据；一个 zone 失败不影响其他
- 老配置会自动迁移：原有 `zone/provider/cert_mode/edge_port` 变成第一个 zone，服务补上 `zone` 字段，
  旧 `certs/wildcard.crt` 会复制成 `certs/<zone>.crt`

## DNS 提供商

| 提供商 | 凭据 | acme.sh hook | 说明 |
|---|---|---|---|
| **Cloudflare**（默认） | API Token（`Zone:Zone:Read` + `Zone:DNS:Edit`） | `dns_cf` | AAAA 记录灰云 |
| **阿里云 DNS** | RAM 子账号 AccessKey ID + Secret | `dns_ali` | 需域名托管在阿里云解析 |

```sh
# Cloudflare
v6edge init --zone example.com --token 'cf_token' --edge-port 8443

# 阿里云
v6edge init --zone example.com --provider aliyun \
  --ali-key 'LTAI...' --ali-secret 'xxxx' --edge-port 8443
```

切换提供商（`v6edge init --provider ...`）**不会迁移记录**：旧提供商的记录需自行删除，
新提供商的域名要先加好解析，之后由 v6edge 的 DDNS 接管维护。

### 阿里云注意事项

1. **用 RAM 子账号**，权限只给 `AliyunDNSFullAccess`（或自定义到单域名），不要用主账号 AccessKey
2. 建议在 RAM 里给该 AccessKey **绑定 IP 白名单**（阿里云控制台 → AccessKey 详情 → 网络访问限制）
3. 阿里云没有"代理"概念，`proxied` 对它是空操作；TTL 固定用 600
4. 阿里云的 AccessKey 是长期凭据，比 Cloudflare Token 危险：定期轮换，泄露就立即禁用
5. 证书走 `dns_ali`，同样不需要公网 80/443

```sh
v6edge provider show     # 当前提供商
v6edge provider creds    # 打印凭据（root），UI 用来回填
v6edge provider test     # 校验凭据 + 域名是否可用
```

## 安装

`node tools/build-bundle.js` 会产出以下产物（点击文件名直接下载，链接指向 latest Release，不用随版本更新）：

| 产物 | 适用 | 说明 |
|---|---|---|
| [`v6edge-0.1.0-r1.apk`](https://github.com/keduoli-lovely/v6edge/releases/latest/download/v6edge-0.1.0-r1.apk) + [`luci-app-v6edge-0.1.0-r1.apk`](https://github.com/keduoli-lovely/v6edge/releases/latest/download/luci-app-v6edge-0.1.0-r1.apk) | **apk 系（iStoreOS 25.x / OpenWrt 25.x）** | ADB 格式，iStoreOS 离线安装页可直接装（页面用 `apk add --allow-untrusted`，未签名也接受）。本机构建：`sh tools/build-apk-on-device.sh /tmp/out` |
| [`v6edge_0.1.0-24_all.ipk`](https://github.com/keduoli-lovely/v6edge/releases/latest/download/v6edge_0.1.0-24_all.ipk) + [`luci-app-v6edge_0.1.0-24_all.ipk`](https://github.com/keduoli-lovely/v6edge/releases/latest/download/luci-app-v6edge_0.1.0-24_all.ipk) | **opkg 系（OpenWrt 24.10 / iStoreOS 24.x）** | `opkg install ...`。⚠️ apk 系统装 ipk 会报 `file format is invalid or inconsistent` |
| [`v6edge-0.1.0.run`](https://github.com/keduoli-lovely/v6edge/releases/latest/download/v6edge-0.1.0.run) | iStoreOS「离线安装」页 / 任意 shell | 自解压安装器，`sh v6edge-0.1.0.run [--fresh]` |
| [`v6edge-0.1.0-bundle.tar.gz`](https://github.com/keduoli-lovely/v6edge/releases/latest/download/v6edge-0.1.0-bundle.tar.gz) | 手动解压安装 | 解压后 `sh install.sh` |

> 两种包管理器只需装对应格式，安装后 `/etc/config/v6edge` 与 `/etc/v6edge/` 都不会被覆盖。

所有安装方式都**幂等**：只有 `/etc/config/v6edge` 不存在时才写默认配置；
`/etc/v6edge/` 下的 token、证书、acme、doctor 结果、nginx 生成文件、防火墙规则、cron 都不会被动。

## 快速开始

```sh
# 1. 初始化（Token 需要 Zone:Zone:Read + Zone:DNS:Edit，只授本 zone）
v6edge init --zone example.com --token 'xxxx' --edge-port 8443 --cert-mode wildcard

# 2. 签证书（通配符只需一次）
v6edge cert

# 3. 发布一个服务：把 NAS 的 Jellyfin 发布到 https://jellyfin.example.com:8443
v6edge add jellyfin 192.168.1.10:8096 edge

# 4. 自检
v6edge doctor

# 5. 只给内网的入口（不开公网端口）
v6edge add nas-admin 192.168.1.10:5000 2284 --lan-only
```

手机/外网访问：`https://jellyfin.example.com:8443`

## 命令

| 命令 | 说明 |
|---|---|
| `v6edge init --zone <域名> --token <TOKEN> [--edge-port 8443] [--cert-mode wildcard\|per-domain]` | 初始化（token 留空表示保留旧值） |
| `v6edge cert [--force]` | 签发/续期证书 |
| `v6edge add <名字> <内网IP:端口> [端口\|edge] [--lan-only] [--large] [--no-ws] [--https-backend] [--deny-post '/路径'] [--domain 子域]` | 发布服务 |
| `v6edge set <名字> [--port X] [--target IP:端口] [--lan-only 0\|1] [--large 0\|1] [--ws 0\|1] [--scheme http\|https] [--deny-post '/路径'] [--enabled 0\|1]` | 修改服务 |
| `v6edge rm <名字>` | 删除并回滚 |
| `v6edge list` | 列表 |
| `v6edge ddns sync\|status\|enable\|disable\|interval <分钟>\|add\|rm\|set-extra` | DDNS 管理 |
| `v6edge doctor` | 自检 |
| `v6edge status [--json]` | 状态（LuCI 用） |
| `v6edge reload` | 校验并重载 nginx |

### 选项说明

| 选项 | 含义 |
|---|---|
| `--lan-only` | 只允许局域网来源（`allow` 私网段 + `deny all`），且不开放公网端口。给管理面板用。 |
| `--large` | 关闭 nginx 缓冲、解除 body 限制，适合照片/视频/下载站。 |
| `--https-backend` | 内网目标本身是 https。默认 http。 |
| `--no-ws` | 关闭 WebSocket 透传（默认开启）。 |
| `--deny-post /path` | 该路径的 POST 直接 403（如 Immich 公网关闭密码登录）。 |
| `--domain <子域>` | 复用已有域名（例如给同一域名再开一个仅内网端口）。 |
| `ddns interval <N>` | 修改 DDNS 检查间隔（分钟），自动重写 cron。 |

## 端口模式

- **统一边缘端口**（默认）：`add ... edge` 全部走 `edge_port`（默认 8443），防火墙只开一个口，靠 SNI 分流。
- **每服务独立端口**：`add <名字> <目标> 8080`，则监听 8080 并单独放行。
- **仅内网**：`--lan-only`，nginx 用 `allow/deny` 限制来源，且**不**加防火墙规则。

## 注意事项（重要）

1. **光猫/上级路由的 IPv6 防火墙必须关闭或放行**，否则所有入站都被丢弃（v6edge 里 `doctor` 会提示）。
   中国移动 ZTE 光猫常见开关：`安全 → 防火墙 → Ipv6Spi` 取消勾选。
2. **运营商常封 80/443/8080**，公网端口请用高位端口（默认 8443）。
3. **LuCI 占用 80/443**（uhttpd），v6edge 不接管；边缘端口别设成 80/443。
4. **IPv6 前缀会变**（重拨/运营商轮换），必须保持 DDNS 定时任务启用（默认 10 分钟），
   否则 AAAA 会指向旧地址。
5. **Cloudflare Token 最小权限**：`Zone:Zone:Read` + `Zone:DNS:Edit`，Zone Resources 只选目标域名。
   Token 存在 `/etc/v6edge/token`（0600）。
6. **不要裸露无认证的管理面板**（qBittorrent/Portainer/路由器后台）。用 `--lan-only`，
   或在 nginx 里额外加 `auth_basic`。
7. 证书走 **DNS-01**，不需要公网 80/443，也不受运营商封端口影响；续期由 acme.sh cron 自动完成并 reload nginx。
8. AAAA 记录是**灰云（DNS only）**：橙云代理回源端口受限，且会多一跳，不适合这种自建场景。
9. 本工具会写：`/etc/config/v6edge`、`/etc/v6edge/*`、`/etc/nginx/conf.d/v6edge-*.conf`、
   `firewall.v6edge_<port>`、`/etc/crontabs/root` 两行（DDNS + 证书续期）。
   `rm` 只回滚与具体服务相关的内容。

## 目录结构

```
/usr/bin/v6edge                 主程序（POSIX sh）
/etc/config/v6edge              UCI 配置（global + 每个服务一个 section）
/etc/v6edge/token               Cloudflare API Token (0600)
/etc/v6edge/certs/              证书 (wildcard.crt/key 或 <fqdn>.crt/key)
/etc/v6edge/acme/               acme.sh 工作目录
/etc/v6edge/zone.id             zone id 缓存
/etc/v6edge/ip                  上次同步的 IPv6
/etc/v6edge/v6edge.log          操作日志
/etc/nginx/conf.d/v6edge-*.conf 自动生成的反代配置
```

## 安全

- 所有操作需要 root；LuCI 页面通过 rpcd ACL 只允许执行 `/usr/bin/v6edge` 与读写 `/etc/v6edge/*`。
- 公网只暴露你显式放行的端口，其余仍由防火墙默认拒绝。
- 建议定期轮换 Cloudflare Token：`v6edge init --zone <域名> --token <新token>`。

## 许可

MIT
