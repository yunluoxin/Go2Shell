// Go2Shell 共享模块：defaults 读写与设置对话框。
// 由 build.sh 与 src/main.js / src/settings.js 拼接后编译，不单独运行。

ObjC.import('AppKit')

const DOMAIN = 'com.east.go2shell'
const KEY_TERMINAL = 'terminal'
const KEY_NEW_WINDOW = 'newWindow'
const DEFAULT_TERMINAL = 'Terminal'

const app = Application.currentApplication()
app.includeStandardAdditions = true

function shellQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'"
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

// 设置对话框：三个快捷终端按钮 + 自定义任意 app 名，配「总是开新窗口」勾选框。
// NSAlert 按钮添加顺序是从右往左，最后添加的按钮在最右且是默认（Return）按钮。
// app 为 LSUIElement 后台应用：对话框悬浮在前台应用之上，不切换应用、不动 Finder。
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
