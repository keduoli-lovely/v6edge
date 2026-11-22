include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-v6edge
PKG_VERSION:=0.1.0
PKG_RELEASE:=1
PKG_LICENSE:=MIT

LUCI_TITLE:=LuCI app for v6edge (Cloudflare edge manager)
LUCI_DESCRIPTION:=Manage Cloudflare DNS/TLS/reverse-proxy services, DDNS and self-check from LuCI.
LUCI_DEPENDS:=+luci-base +v6edge
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
$(eval $(call BuildPackage,$(PKG_NAME)))
