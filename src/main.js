#!/usr/bin/env osascript -l JavaScript
// Go2Shell — 点击 Finder 工具栏图标，在当前目录打开默认终端。
// 终端选择完全由 defaults（domain com.east.go2shell）决定，不做任何自动检测；
// 未设置时使用固定默认值 Terminal。设置入口是 Go2Shell Settings.app。
//
// 注意：不要把设置入口做回 ⌥点击 工具栏图标——本机 macOS 上 ⌥点击 工具栏应用图标
// 会触发 Finder 自身的「打开并关闭当前窗口」行为，当前 Finder 窗口在 app 启动前
// 就被系统关掉，app 内无法拦截；且修饰键检测受 app 启动延迟影响存在竞态。

function envGet(name) {
  const v = $.NSProcessInfo.processInfo.environment.objectForKey(name)
  return v ? String(ObjC.unwrap(v)) : ''
}

function frontFinderPath() {
  try {
    const url = Application('Finder').windows[0].target().url()
    if (!/^file:\/\//.test(url)) return null
    return decodeURIComponent(url.replace(/^file:\/\//, ''))
  } catch (e) {
    return null
  }
}

function openAt(terminal, path, newWindow) {
  app.doShellScript('open ' + (newWindow ? '-n ' : '') + '-a ' + shellQuote(terminal) + ' ' + shellQuote(path))
}

function openFailed(terminal, e) {
  app.displayDialog('打开 ' + terminal + ' 失败：\n' + String(e) + '\n\n打开 Go2Shell Settings 可重新设置默认终端。', {
    buttons: ['好'],
    defaultButton: '好',
    withTitle: 'Go2Shell',
  })
}

function main() {
  const mode = envGet('GO2SHELL_MODE')

  // 调试入口：打印当前配置与将执行的命令
  if (mode === 'printinfo') {
    const path = frontFinderPath()
    const terminal = readTerminal() || DEFAULT_TERMINAL
    const newWindow = readNewWindow()
    console.log(JSON.stringify({
      terminal: terminal,
      newWindow: newWindow,
      path: path,
      command: path ? 'open ' + (newWindow ? '-n ' : '') + '-a ' + shellQuote(terminal) + ' ' + shellQuote(path) : null,
    }))
    return
  }

  // 调试入口：不经对话框直接写配置（GO2SHELL_TERMINAL / GO2SHELL_NEWWIN=1）
  if (mode === 'set') {
    const t = envGet('GO2SHELL_TERMINAL')
    if (t) writeSettings(t, envGet('GO2SHELL_NEWWIN') === '1')
    console.log(JSON.stringify({ terminal: readTerminal(), newWindow: readNewWindow() }))
    return
  }

  // 调试入口：直接弹出设置对话框
  if (mode === 'dialog') {
    console.log(JSON.stringify(showSettings()))
    return
  }

  const path = frontFinderPath()
  if (path === null) {
    showSettings()
    return
  }
  const terminal = readTerminal() || DEFAULT_TERMINAL
  const newWindow = readNewWindow()
  try {
    openAt(terminal, path, newWindow)
  } catch (e) {
    openFailed(terminal, e)
  }
}

main()
