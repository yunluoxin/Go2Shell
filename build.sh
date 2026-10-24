#!/bin/bash
# 构建两个 applet（JXA → osacompile，产物 universal：x86_64 + arm64）：
#   Go2Shell.app           点击在当前目录打开默认终端
#   Go2Shell Settings.app  设置入口（独立 applet：⌥点击 工具栏图标会触发 Finder
#                          关闭当前窗口，且修饰键检测有启动竞态，故用独立图标）
# 共享代码在 src/settings-ui.js，构建时与入口拼接编译。
set -euo pipefail
cd "$(dirname "$0")"

APP="Go2Shell.app"
SETTINGS_APP="Go2Shell Settings.app"
BUNDLE_ID="com.east.go2shell"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 拼接共享模块与入口脚本（各自 shebang 去重，合并后保留一个）
combine() { # <输出文件> <入口脚本...>
  { echo '#!/usr/bin/env osascript -l JavaScript'
    grep -hv '^#!' src/settings-ui.js "$@"
  } > "$1"
}
combine "$TMP/main.js" src/main.js
combine "$TMP/settings.js" src/settings.js

build_app() { # <合并脚本> <app 名> <bundle id> <显示名> <图标 icns>
  local src="$1" app="$2" bid="$3" name="$4" icon="$5"
  rm -rf "$app"
  osacompile -l JavaScript -o "$app" "$src"

  local PLIST="$app/Contents/Info.plist"
  pb_set() { # key type value
    /usr/libexec/PlistBuddy -c "Set :$1 $3" "$PLIST" 2>/dev/null ||
    /usr/libexec/PlistBuddy -c "Add :$1 $2 $3" "$PLIST"
  }
  pb_set CFBundleIdentifier string "$bid"
  pb_set CFBundleName string "$name"
  # 后台应用：不进 Dock、不抢焦点，设置对话框悬浮在前台应用之上
  pb_set LSUIElement bool true
  pb_set NSAppleEventsUsageDescription string "Go2Shell needs to control Finder to get the current folder and open your terminal."

  # 模板自带的 Assets.car 里编译了默认 applet 图标，且优先级高于 CFBundleIconFile，
  # 必须删掉才能让自带的 applet.icns 生效（macOS 11+ 行为）。
  rm -f "$app/Contents/Resources/Assets.car"
  /usr/libexec/PlistBuddy -c "Delete :CFBundleIconName" "$PLIST" 2>/dev/null || true
  cp "$icon" "$app/Contents/Resources/applet.icns"

  codesign --force --sign - "$app"
  touch "$app"
  file "$app/Contents/MacOS/applet"
}

GEAR="/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/ToolbarAdvanced.icns"
[ -f "$GEAR" ] || GEAR="assets/applet.icns"

build_app "$TMP/main.js" "$APP" "$BUNDLE_ID" "Go2Shell" assets/applet.icns
build_app "$TMP/settings.js" "$SETTINGS_APP" "$BUNDLE_ID.settings" "Go2Shell Settings" "$GEAR"

echo "Built $APP and $SETTINGS_APP"
