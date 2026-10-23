#!/bin/bash
# 构建 Go2Shell.app：osacompile(JXA) → patch Info.plist → 覆盖图标 → ad-hoc 重签
# 产物为 universal（x86_64 + arm64）。
set -euo pipefail
cd "$(dirname "$0")"

APP="Go2Shell.app"
BUNDLE_ID="com.east.go2shell"

rm -rf "$APP"
osacompile -l JavaScript -o "$APP" src/main.js

PLIST="$APP/Contents/Info.plist"
pb_set() { # key type value
  /usr/libexec/PlistBuddy -c "Set :$1 $3" "$PLIST" 2>/dev/null ||
  /usr/libexec/PlistBuddy -c "Add :$1 $2 $3" "$PLIST"
}
pb_set CFBundleIdentifier string "$BUNDLE_ID"
pb_set CFBundleName string "Go2Shell"
pb_set NSAppleEventsUsageDescription string "Go2Shell needs to control Finder to get the current folder and open your terminal."

# 模板自带的 Assets.car 里编译了默认 applet 图标，且优先级高于 CFBundleIconFile，
# 必须删掉才能让自带的 applet.icns 生效（macOS 11+ 行为）。
rm -f "$APP/Contents/Resources/Assets.car"
/usr/libexec/PlistBuddy -c "Delete :CFBundleIconName" "$PLIST" 2>/dev/null || true

cp assets/applet.icns "$APP/Contents/Resources/applet.icns"

codesign --force --sign - "$APP"
touch "$APP"

echo "Built $APP"
file "$APP/Contents/MacOS/applet"
