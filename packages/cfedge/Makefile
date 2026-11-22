include $(TOPDIR)/rules.mk

PKG_NAME:=cfedge
PKG_VERSION:=0.1.0
PKG_RELEASE:=1
PKG_LICENSE:=MIT
PKG_MAINTAINER:=cfedge

include $(INCLUDE_DIR)/package.mk

define Package/cfedge
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Web Servers/Proxies
  TITLE:=Cloudflare edge helper (AAAA + Let's Encrypt + nginx vhosts)
  URL:=https://github.com/keduoli-lovely/cfedge
  DEPENDS:=+curl +ca-bundle +openssl-util +nginx-full +acme-acmesh +acme-acmesh-dnsapi +jsonfilter
  PKGARCH:=all
endef

define Package/cfedge/description
  cfedge 用 Cloudflare API 自动维护 AAAA 记录、用 acme.sh DNS-01 签发
  Let's Encrypt 证书，并生成 nginx TLS 反代，把局域网服务安全地暴露到公网
  IPv6。附带 doctor 自检和一键回滚。
endef

define Build/Compile
endef

define Package/cfedge/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/usr/bin/cfedge $(1)/usr/bin/cfedge
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/cfedge $(1)/etc/config/cfedge
	$(INSTALL_DIR) $(1)/etc/cfedge/certs
	$(INSTALL_DIR) $(1)/etc/cfedge/acme
endef

define Package/cfedge/conffiles
/etc/config/cfedge
endef

$(eval $(call BuildPackage,cfedge))
