include $(TOPDIR)/rules.mk

PKG_NAME:=v6edge
PKG_VERSION:=0.1.0
PKG_RELEASE:=1
PKG_LICENSE:=MIT
PKG_MAINTAINER:=v6edge

include $(INCLUDE_DIR)/package.mk

define Package/v6edge
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Web Servers/Proxies
  TITLE:=Cloudflare edge helper (AAAA + Let's Encrypt + nginx vhosts)
  URL:=https://github.com/keduoli-lovely/v6edge
  DEPENDS:=+curl +ca-bundle +openssl-util +nginx-full +acme-acmesh +acme-acmesh-dnsapi +jsonfilter
  PKGARCH:=all
endef

define Package/v6edge/description
  v6edge 用 Cloudflare API 自动维护 AAAA 记录、用 acme.sh DNS-01 签发
  Let's Encrypt 证书，并生成 nginx TLS 反代，把局域网服务安全地暴露到公网
  IPv6。附带 doctor 自检和一键回滚。
endef

define Build/Compile
endef

define Package/v6edge/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/usr/bin/v6edge $(1)/usr/bin/v6edge
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/v6edge $(1)/etc/config/v6edge
	$(INSTALL_DIR) $(1)/etc/v6edge/certs
	$(INSTALL_DIR) $(1)/etc/v6edge/acme
endef

define Package/v6edge/conffiles
/etc/config/v6edge
endef

$(eval $(call BuildPackage,v6edge))
