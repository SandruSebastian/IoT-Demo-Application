NODE_MODULES   ?= $(PWD)/node_modules

JEST           := $(NODE_MODULES)/.bin/jest
ESLINT         := $(NODE_MODULES)/.bin/eslint
BABEL          := $(NODE_MODULES)/.bin/babel

RN_CLI         := $(NODE_MODULES)/.bin/react-native
RN_UPGRADE     := $(NODE_MODULES)/.bin/react-native-git-upgrade
GETTEXT_PARSER := $(NODE_MODULES)/.bin/react-gettext-parser

WATCHMAN       := watchman
FASTLANE       := fastlane
RNC_ROOT       := $(NODE_MODULES)/react-native-config

EMULATOR       := $(ANDROID_HOME)/emulator/emulator
ADB            := $(ANDROID_HOME)/platform-tools/adb

BUILD_TYPE ?= Debug
VERSION    ?= 1.0.0
LANE       ?= beta

XCODE_BUILD_DIR := $(PWD)/ios/build/Build/Products
SIMULATOR_TYPE  ?= "iPhone X"

deps:
	yarn install --modules-folder $(NODE_MODULES)
	command -v pod >> /dev/null && cd $(PWD)/ios && pod install || echo "Skipping pods."

packager:
	$(RN_CLI) start

clean:
	command -v watchman >> /dev/null && watchman watch-del-all || echo "Skipping watchman cleanup."
	rm -rf build
	rm -rf $(NODE_MODULES)
	rm -rf ios/Pods
	rm -rf ios/build
	rm -rf android/.gradle
	rm -rf android/build
	rm -rf android/app/build
	rm -f android/eventx.iml
	rm -rf $(TMPDIR)react-*
	rm -rf $(TMPDIR)metro-*
	rm -rf ~/Library/Developer/Xcode/DerivedData/eventx*

lint:
	$(ESLINT) 'src/**/*.js' --color

run-android:
	$(EMULATOR) -avd $(shell $(EMULATOR) -list-avds|tail -1) -dns-server 8.8.8.8 > /dev/null 2>&1 &
	BABEL_DISABLE_CACHE=1 BUILD_TYPE=$(BUILD_TYPE) VERSION=$(VERSION) $(RN_CLI) run-android --no-packager --variant $(BUILD_TYPE)

run-ios:
	BABEL_DISABLE_CACHE=1 BUILD_TYPE=$(BUILD_TYPE) VERSION=$(VERSION) $(RN_CLI) run-ios --no-packager --configuration $(BUILD_TYPE) --simulator=$(SIMULATOR_TYPE)
