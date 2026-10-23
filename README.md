# Go2Shell By AppleScript

Open a terminal window at the current Finder folder with one click. Works with Ghostty, iTerm2, Terminal.app — or any terminal app by name. Universal binary, runs natively on Apple Silicon.

![](./img/1.png)

## How to use

- Copy `Go2Shell.app` to the Application directory.
- Hold down the Command key and drag it to the Finder toolbar.
- Click the icon: your default terminal opens at the current folder.
- Hold ⌥ and click the icon: settings dialog — pick Ghostty / iTerm2 / Terminal, enter any custom app name, and toggle "always open a new window".
- Or set it from the command line:

  ```sh
  defaults write com.east.go2shell terminal Ghostty    # iTerm / Terminal / Warp / any app name
  defaults write com.east.go2shell newWindow -bool true
  ```

The default is Terminal until you set one. The first launch asks for permission to control Finder.

## Build

```sh
./build.sh
```

## Thanks

The main implementation comes from [wonderyue/Go2ShellAppleScript](https://github.com/wonderyue/Go2ShellAppleScript), I just changed the icon and added a new window to open iTerm2 like Go2Shell。
