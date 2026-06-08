VERSION := $(shell node -p "require('./package.json').version")
APP_ID_MODERN := dk.otvald.immichtv
APP_ID_LEGACY := dk.otvald.immichtv.legacy
BUILD_DIR := ./webos-build

pack:
	npm run pack-p && ares-package dist/ -o $(BUILD_DIR)/ -n

pack-modern:
	WEBOS_TARGET=modern npm run pack:modern && ares-package dist/ -o $(BUILD_DIR)/ -n

pack-legacy:
	WEBOS_TARGET=legacy npm run pack:legacy && ares-package dist/ -o $(BUILD_DIR)/ -n

install: install-modern

install-modern: pack-modern
	ares-install --device lg-tv $(BUILD_DIR)/$(APP_ID_MODERN)_$(VERSION)_all.ipk

install-legacy: pack-legacy
	ares-install --device lg-tv $(BUILD_DIR)/$(APP_ID_LEGACY)_$(VERSION)_all.ipk

launch:
	ares-launch --device lg-tv $(APP_ID_MODERN)

launch-modern:
	ares-launch --device lg-tv $(APP_ID_MODERN)

launch-legacy:
	ares-launch --device lg-tv $(APP_ID_LEGACY)

inspect:
	ares-inspect --device lg-tv $(APP_ID_MODERN)

inspect-modern:
	ares-inspect --device lg-tv $(APP_ID_MODERN)

inspect-legacy:
	ares-inspect --device lg-tv $(APP_ID_LEGACY)
