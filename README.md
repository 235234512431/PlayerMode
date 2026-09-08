# PlayerMode

PlayerMode 是 SillyTavern 的独立第三方 UI 扩展：用 CSS 将当前聊天简化为玩家界面，全部生成与保存仍由 SillyTavern 原生完成。

## 安装方式

本交付未自动安装、启动服务或修改任何 SillyTavern 文件。请先检查代码。

手动安装时，把整个 `PlayerMode` 文件夹复制到以下位置之一，不覆盖已有同名目录：

- 全局：`SillyTavern/public/scripts/extensions/third-party/PlayerMode/`
- 当前用户：`SillyTavern/data/<用户标识>/extensions/PlayerMode/`（自定义 dataRoot 时使用实际数据目录）。

不要两处重复安装。`manifest.json` 应直接位于 `PlayerMode` 内，不能多嵌套一层。然后自行重新加载浏览器页面，在扩展管理中确认已启用；服务器必须已允许第三方扩展。

网页安装：在 SillyTavern 的扩展 → 安装扩展中填写 `https://github.com/235234512431/PlayerMode`，安装完成后重新加载页面。本仓库根目录直接包含扩展入口文件。

## 开启方式

先在普通界面选好角色、聊天、世界书、Preset 和 API，确认原生聊天正常，再点击右上角 `PlayerMode OFF · 开启`。

ON 后主要保留历史消息、原生输入框、发送按钮，以及生成中的原生停止按钮。当前聊天 DOM 不被移动、克隆或替换。开关不会刷新页面，不会清空输入或中断生成。

## 关闭方式与应急恢复

- 点击右上角 `PlayerMode ON · 退出`，立即去掉全部 PlayerMode 样式覆盖。
- 按 `Ctrl+Shift+P` 强制关闭（焦点须在主页面，嵌入 iframe 或浏览器快捷键拦截可能影响该方式）。
- 重新加载页面默认 OFF。开关仅存内存，不使用 LocalStorage、不写用户设置。
- 应急：在地址查询参数中加 `?playermode=0` 后重新加载；已有查询参数则加 `&playermode=0`，放在 `#` 片段之前。安全模式下禁止开启，移除此参数并重新加载才可再开启。重新加载前注意原生页面尚未保存的输入。

退出按钮有独立的内联基础样式，即使扩展 CSS 没有加载也能显示。所有宿主 CSS 覆盖都以 `body.playermode-active` 开头；去掉此 class 即恢复原生样式。没有保存或覆盖宿主原来的 style、class、面板状态。

## 删除方式

先关闭 PlayerMode，再在扩展管理中禁用，或手动删除安装的 `PlayerMode` 目录，然后重新加载浏览器页面。已经加载到浏览器中的 JS/CSS 不会因磁盘目录被删除而自动消失，因此需要重新加载。没有额外配置、数据文件或存储键需要清理。

## 当前功能

- 独立 manifest、JS 和 CSS，无构建步骤，无新增依赖。
- 隐藏顶部管理栏、管理抽屉、聊天管理菜单、消息编辑操作和滑动切换按钮。
- 居中自适应聊天布局；保留原生消息格式、输入、发送与生成停止。
- 常驻 ON/OFF、快捷键退出、URL 安全模式；关键 DOM 缺失时拒绝开启并输出 warning。
- 仅记录初始化、模式切换和异常，不监听流式 token、不刷消息内容。

## 本地兼容性调查

研究对象：开发时本地安装的 SillyTavern，`package.json` 标识版本 **1.18.0**。只读取源码，未修改该目录。

参考源文件及确认结果：

| 本地源码 | 确认内容 |
| --- | --- |
| `public/scripts/extensions/regex/manifest.json` | `display_name/loading_order/requires/optional/js/css/author/version` 格式 |
| `public/scripts/extensions.js` | manifest 的 JS 以 `type=module` 加载，CSS 通过独立样式表加载；禁用默认重新加载页面 |
| `public/script.js` | 全局 `SillyTavern.getContext()`；`#send_but` 原生点击交给 `userInputGenerateMutex.update()` |
| `public/scripts/st-context.js` | 上下文提供 `chat/characterId/groupId/chatId`、`eventSource`、`eventTypes`；本扩展不需要读取聊天数据 |
| `public/scripts/events.js`、`public/lib/eventemitter.js` | `APP_READY` 表示应用就绪，并向晚注册的监听器重放，支持首次及延后加载 |
| `public/index.html` | `#sheld/#chat/#form_sheld/#send_form/#nonQRFormItems/#send_textarea/#rightSendForm/#send_but/#mes_stop` |
| `src/constants.js`、`src/endpoints/extensions.js` | 全局和用户扩展目录、第三方扩展发现机制 |

JS 必需 DOM 选择器集中在 `selectors`；显示隐藏和布局选择器集中在 `style.css`。没有使用 `nth-child`。不调用 Generate，不模拟发送点击，用户直接操作原生按钮；不改变发送/停止按钮的原生显示状态。

## 已知问题与边界

- 这是 UI 简化，不是权限系统。退出按钮、开发者工具、原生快捷键、斜杠命令等仍可触达宿主能力，不能把它当作远程访客的安全隔离措施。
- 其他扩展的独立浮窗、Quick Replies、主题自定义控件或弹窗可能仍显示。为了不破坏生成期间所需交互，没有一刀切隐藏所有 body 子节点或通用弹窗。管理面板内的扩展设置会隐藏，扩展后台逻辑仍运行。
- DOM 改版、主题的高优先级样式、移动设备键盘和特殊布局可能影响外观；目前只核对了本机 1.18.0 源码，没有承诺跨版本兼容。
- 原生消息正文及其链接、按钮、富文本保持原样；这不是内容过滤器。
- 未选聊天、API 未连接或原生配置有问题时，扩展不会自动配置或修复。请退出后处理。
- 如果正在编辑消息、删除消息或打开管理弹窗，先完成/取消操作再开启，避免隐藏操作中的入口。

## 自检与验收

已完成静态与隔离模拟检查：manifest 入口存在、CSS 语法及作用域、初始化重复调用、连续五次 ON/OFF、快捷键退出、URL 强制关闭、缺失关键 DOM 拒绝开启。检查不启动 SillyTavern、不发送请求、不写聊天。没有新增模型请求、Prompt 拼接、世界书扫描逻辑或宿主文件写入逻辑。

**尚未在安装后的真实浏览器中验证视觉布局或模型生成。** 模拟检查不能替代以下手动验收：

1. 普通 UI 选择测试聊天，先确认原生能正常生成。记录角色、Preset、世界书及 API 的当前配置。
2. 开启 PlayerMode：确认历史消息与格式保留、管理栏隐藏，输入并点击原生发送。
3. 确认 AI 正常回复、流式输出逐步出现；生成中测试停止按钮，确认后续仍可发送。
4. 发送已有世界书条目的触发词；退出后用原生 Prompt 检查功能确认条目实际插入，而不只根据回复猜测。
5. 检查原生 Prompt、Preset、正则及已启用的 Summary/Vector Storage 等仍按原配置工作。
6. ON/OFF 切换前后确认草稿和消息没有丢失；在生成中切换一次，确认流式继续。
7. 待原生保存完成后重新加载，确认历史存在且 PlayerMode 默认 OFF。
8. 测试 URL 安全模式、桌面和手机宽度，以及你正在使用的主题和第三方扩展。
9. 禁用/删除扩展并重新加载，确认普通 UI 与原有功能恢复。

上述实际聊天、世界书、Preset、API 与保存验收需手动执行；当前交付不将这些项目标记为已通过。
