#!/usr/bin/env osascript -l JavaScript
// Go2Shell — 点击 Finder 工具栏图标，在当前目录打开默认终端。
// 终端选择完全由 defaults（domain com.east.go2shell）决定，不做任何自动检测；
// 未设置时使用固定默认值 Terminal。按住 ⌥ 点击弹出设置对话框。

ObjC.import('CoreGraphics')
ObjC.import('AppKit')

const DOMAIN = 'com.east.go2shell'
const KEY_TERMINAL = 'terminal'
const KEY_NEW_WINDOW = 'newWindow'
const DEFAULT_TERMINAL = 'Terminal'

// kCGEventFlagMaskAlternate（CoreGraphics 桥接常量在部分系统上不可直接引用）
const FLAG_ALTERNATE = 1 << 19

const app = Application.currentApplication()
app.includeStandardAdditions = true

function envGet(name) {
  const v = $.NSProcessInfo.processInfo.environment.objectForKey(name)
  return v ? String(ObjC.unwrap(v)) : ''
}

function shellQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'"
}

function optionHeld() {
  try {
    return ($.CGEventSourceFlagsState(0) & FLAG_ALTERNATE) !== 0
  } catch (e) {
    return false
  }
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

function readTerminal() {
  try {
    const v = app.doShellScript('defaults read ' + DOMAIN + ' ' + KEY_TERMINAL).trim()
    return v || null
  } catch (e) {
    return null
  }
}

function readNewWindow() {
  try {
    return app.doShellScript('defaults read ' + DOMAIN + ' ' + KEY_NEW_WINDOW).trim() === '1'
  } catch (e) {
    return false
  }
}

function writeSettings(terminal, newWindow) {
  app.doShellScript('defaults write ' + DOMAIN + ' ' + KEY_TERMINAL + ' ' + shellQuote(terminal))
  app.doShellScript('defaults write ' + DOMAIN + ' ' + KEY_NEW_WINDOW + ' -bool ' + (newWindow ? 'true' : 'false'))
}

function openAt(terminal, path, newWindow) {
  app.doShellScript('open ' + (newWindow ? '-n ' : '') + '-a ' + shellQuote(terminal) + ' ' + shellQuote(path))
}

function openFailed(terminal, e) {
  app.displayDialog('打开 ' + terminal + ' 失败：\n' + String(e) + '\n\n按住 ⌥ 点击 Go2Shell 图标可重新设置默认终端。', {
    buttons: ['好'],
    defaultButton: '好',
    withTitle: 'Go2Shell',
  })
}

// 设置对话框：三个快捷终端按钮 + 自定义任意 app 名，配「总是开新窗口」勾选框。
// NSAlert 按钮添加顺序是从右往左，最后添加的按钮在最右且是默认（Return）按钮。
function showSettings() {
  const current = readTerminal() || DEFAULT_TERMINAL
  const currentNew = readNewWindow()
  const added = [
    { title: 'Ghostty', value: 'Ghostty' },
    { title: 'iTerm2', value: 'iTerm' },
    { title: 'Terminal', value: 'Terminal' },
    { title: '自定义…', value: null },
  ]
  const currentIsBuiltin = added.some(function (c) { return c.value === current })
  const alert = $.NSAlert.alloc.init
  alert.messageText = 'Go2Shell 设置'
  alert.informativeText = '选择默认终端。按 Esc 不保存。'
  for (const c of added) {
    const marked = (c.value !== null && c.value === current) || (c.value === null && !currentIsBuiltin)
    alert.addButtonWithTitle((marked ? '✓ ' : '') + c.title)
  }
  const checkbox = $.NSButton.alloc.initWithFrame($.NSMakeRect(0, 0, 200, 18))
  checkbox.setButtonType(3) // NSButtonTypeSwitch
  checkbox.title = '总是开新窗口'
  checkbox.state = currentNew ? 1 : 0
  alert.accessoryView = checkbox
  const idx = alert.runModal - 1000
  if (idx < 0 || idx >= added.length) return null
  let chosen = added[idx].value
  if (chosen === null) {
    chosen = promptCustom(currentIsBuiltin ? '' : current)
    if (!chosen) return null
  }
  const newWindow = checkbox.state === 1
  writeSettings(chosen, newWindow)
  return { terminal: chosen, newWindow: newWindow }
}

function promptCustom(prefill) {
  try {
    const res = app.displayDialog('输入终端应用名称（/Applications 中的应用名，如 Warp、WezTerm）：', {
      defaultAnswer: prefill,
      buttons: ['取消', '保存'],
      defaultButton: '保存',
      cancelButton: '取消',
      withTitle: 'Go2Shell 设置',
    })
    const v = res.textReturned.trim()
    return v || null
  } catch (e) {
    return null
  }
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
      optionHeld: optionHeld(),
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

  if (optionHeld()) {
    const saved = showSettings()
    const path = saved ? frontFinderPath() : null
    if (saved && path) {
      try {
        openAt(saved.terminal, path, saved.newWindow)
      } catch (e) {
        openFailed(saved.terminal, e)
      }
    }
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
