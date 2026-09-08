# PlayerMode 0.2.0

PlayerMode 是 SillyTavern 的独立第三方 UI 扩展：简化当前聊天界面，生成、世界书、Preset、正则与保存全部由 SillyTavern 原生负责。

## 网页安装与更新

在 SillyTavern → 扩展 → 安装扩展中填写：

```text
https://github.com/235234512431/PlayerMode
```

安装完成后重新加载页面。已安装旧版本时，在扩展管理中更新 PlayerMode，再重新加载。本目录的 manifest.json 必须位于仓库根目录，无构建步骤、无新增 npm 依赖。

手动安装也可以：把 PlayerMode 文件夹复制到 `SillyTavern/public/scripts/extensions/third-party/PlayerMode/` 或实际数据目录的 `<用户标识>/extensions/PlayerMode/`，不要重复安装或覆盖已有同名目录。不要修改宿主源码、角色卡或配置。

## 默认开启与密码设置

1. 首次安装或从 0.1.0 更新后，先在普通 UI 确认角色、聊天、世界书和 API 已配置。
2. 点击右上角“PlayerMode · 开启”，首次会要求设置至少 8 个字符的退出密码并输入两次。
3. 开启后，当前浏览器记住 ON 状态；以后刷新或重新打开同一站点，会在 SillyTavern APP_READY 后自动开启。
4. 退出验证通过后会记住 OFF；下次开启会再次记住 ON。
5. 普通模式下可点“设置退出密码”更改密码。密码设置取消或存储失败时不会开启。

仅当前浏览器、当前站点生效，不会同步到朋友的浏览器、其他设备或无痕窗口。同源的 SillyTavern 账号共用这份浏览器设置。初始化到 APP_READY 之前可能短暂显示原界面。

## 新对话

极简模式顶部保留“新对话”按钮，触发原生 `#option_start_new_chat` 点击流程，保留原生确认与生成状态检查，不自行创建/清空/保存聊天。当前角色或群组由宿主管理。

原生确认框可能包含“删除当前聊天”选项；如果要保留旧聊天，不要勾选它。生成中能否开始新对话遵循 SillyTavern 原生限制。

## 退出与忘记密码

- 点击“PlayerMode · 退出”，输入正确密码后恢复普通界面。
- `Ctrl+Shift+P` 同样要求密码；取消、Escape 或错误密码都不会退出。
- **不再支持 `?playermode=0` 免密码恢复。**
- 忘记密码时，禁用 PlayerMode 扩展并重新加载。若当前界面无法进入扩展管理，手动把安装目录移出扩展扫描目录，然后重新加载。无需修改任何宿主文件。
- 卸载/禁用不自动删除浏览器偏好；重新安装可能恢复之前的 ON 状态。需要重置时，在该站点的浏览器开发者工具 → Application/存储 → Local Storage 中，仅删除 `PlayerMode.preferences.v1`，不要清空整个站点存储。移回/重新启用扩展后刷新即可重新设置。

这只是防止随手退出的浏览器 UI 密码，不是登录或权限控制。能使用开发者工具、清理存储、禁用扩展的人仍可绕过；不适合作为远程访客的安全隔离。不要使用重要账号的密码。

## 存储与卸载

只向扩展专用 LocalStorage 键 `PlayerMode.preferences.v1` 写入开关状态、随机盐和 PBKDF2-SHA-256 校验值（210000 次），不保存明文密码，不上传密码。Web Crypto 需要 HTTPS 或 localhost 安全上下文；普通远程 HTTP 下无法设置/验证密码，操作失败时不会按普通退出处理。

要卸载，在验证退出后使用扩展管理禁用/删除并刷新，或移除独立 PlayerMode 目录后刷新。需要清除全部扩展状态时，只删除上面的专用存储键。已加载的 JS/CSS 不会因为磁盘文件被删而自动消失，必须刷新。

扩展不读取 API Key，不修改原始消息 DOM 或原生事件处理器。所有宿主样式覆盖都限定在 `body.playermode-active`；OFF 去掉该 class 即恢复宿主样式。扩展自己的顶部按钮和密码窗口使用独立命名。

## 兼容性调查

开发时只读取本地 SillyTavern **1.18.0** 源码，未修改宿主文件。

| 源码 | 使用的机制 |
| --- | --- |
| `public/scripts/extensions/regex/manifest.json` | manifest 的 js/css 等字段 |
| `public/scripts/extensions.js` | JS 模块入口与独立 CSS 加载 |
| `public/script.js`、`scripts/st-context.js` | `SillyTavern.getContext()`；上下文提供 chat/characterId/groupId/chatId，但本扩展不需要读聊天内容 |
| `public/scripts/events.js`、`public/lib/eventemitter.js` | APP_READY，以及对晚注册监听器重放就绪事件 |
| `public/index.html` | 原生聊天、输入框、发送、停止按钮与新对话入口 |
| `public/script.js` | `#option_start_new_chat` 委托事件：原生确认后调用原生新聊天逻辑 |

JS 的宿主选择器集中在 selectors，样式选择器集中在 style.css，不使用 nth-child。不调用模型 API，不构建 Prompt，不扫描世界书，不改写原生发送按钮显示状态。

## 已知限制

- 特殊主题、DOM 改版、手机软键盘可能影响外观。未承诺跨版本兼容。
- 第三方浮窗、Quick Replies、原生弹窗和正文交互仍可能显示，以保留原生功能。
- 快捷键、斜杠命令和开发者工具不受此扩展权限控制。
- 存储损坏、不可读或关键 DOM 缺失时回退普通界面并记录警告；这不是安全边界。
- 多个已打开标签页不会实时同步开关与密码；修改后请刷新其他标签页。
- 正在编辑、删除消息时，请先结束操作再开启。

## 自检与手动验收

隔离测试覆盖密码校验、状态恢复、错误/取消退出、正确退出、快捷键验证、URL 不绕过、原生新对话入口转发以及存储失败处理。测试使用模拟 DOM，不替代真实浏览器验收。

更新后请检查：

1. 首次设置密码，开启后刷新自动 ON；输入框和历史消息保留。
2. 错误密码/取消/Escape 不退出；正确密码退出后刷新保持 OFF。
3. 快捷键同样验证密码；URL 添加 playermode=0 不绕过。
4. 点击新对话，取消原生确认不改变聊天；确认后新聊天正常，未勾选删除时旧聊天保留。
5. 原生发送、流式、停止、角色、Preset、世界书触发及原生保存正常；用原生 Prompt 检查确认世界书实际插入。
6. 当前主题、移动设备和其他扩展兼容；移除扩展并刷新恢复普通界面。

未自动安装或启动 SillyTavern，未调用真实模型；实际聊天与浏览器布局仍需安装后验收。
