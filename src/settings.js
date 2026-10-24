#!/usr/bin/env osascript -l JavaScript
// Go2Shell Settings — 独立设置入口：只弹出设置对话框，不打开终端。
// 拖到 Finder 工具栏或用 Spotlight 打开均可。不做修饰键检测——
// ⌥点击 工具栏图标在本机 macOS 上会触发 Finder 关闭当前窗口，不能作设置入口。

function main() {
  showSettings()
}

main()
