# seeFactory Miniapp

seeFactory Miniapp 是移动端应用，基于 Taro + React 实现。当前重点支持 H5 构建，同时保留微信小程序构建入口。移动端覆盖 Dashboard 的核心职能：控制台、workflow、操练场、创意工坊、调用记录、钱包账单、模型测试、资产库和个人中心。

## 功能范围

- 登录、注册、退出和个人资料维护。
- 移动控制台：首页摘要、余额、workflow、任务、资产和快捷入口。
- No-code workflow：移动端表单化配置链路、纵向节点预览、保存草稿、校验、运行、发布、导出。
- 操练场：服务端保存对话 session，支持文生文、图生文、文生图、文生视频、图生视频。
- 创意工坊：公开样例浏览、运行和克隆。
- 调用记录：任务列表、状态筛选、任务详情和事件查看。
- 钱包账单：充值订单、余额流水、模型扣费记录。
- 模型测试台：模型能力列表和测试调用。
- 资产库：资产列表和外部 URL 资产登记。

## 技术栈

- Taro 4.0.8
- React 18
- `@tarojs/router`
- Webpack 5
- H5 hash router
- 原生 CSS，新扁平风格，移动端优先

## 目录结构

```text
.
├── config/
│   └── index.js
├── public/
│   └── brand/
│       └── logo-icon.png
├── scripts/
│   └── write-h5-index.mjs
├── src/
│   ├── app.config.js
│   ├── app.css
│   ├── app.jsx
│   ├── h5-components.jsx
│   ├── lib.js
│   ├── ui.jsx
│   └── pages/
├── babel.config.cjs
├── package.json
└── README.md
```

## 页面清单

| 路径 | 说明 |
| --- | --- |
| `pages/home/index` | 移动控制台首页 |
| `pages/workflows/index` | Workflow 控制台 |
| `pages/playground/index` | 操练场 |
| `pages/workshop/index` | 创意工坊 |
| `pages/tasks/index` | 调用记录 |
| `pages/profile/index` | 我的账号 |
| `pages/login/index` | 登录注册 |
| `pages/wallet/index` | 钱包账单 |
| `pages/models/index` | 模型测试台 |
| `pages/assets/index` | 资产库 |

## 环境要求

- Node.js 20 或更高版本。
- seeFactory Backend 已启动，并可通过 `http://<hostname>:18280` 访问。

## 安装

```bash
npm install
```

如果在 seeFactory 多端 workspace 根目录安装，也可以使用：

```bash
npm install --workspace @seefactory/mobile
```

## H5 开发

```bash
npm run dev:h5
```

默认开发地址：

```text
http://localhost:18183
```

## H5 构建

```bash
npm run build:h5
```

构建产物输出到：

```text
dist/
```

构建结束后会执行 `scripts/write-h5-index.mjs`，用于修正 H5 静态入口文件。

本轮验证命令：

```bash
npm run build:h5
```

当前构建会出现 Webpack 包体大小 warning，属于 H5 bundle 体积提示，不影响产物生成。

## 操练场

底部 tabBar 包含 `操练场`。由于小程序 tabBar 通常最多 5 个入口，`调用记录` 保留为二级页面，可从首页、工作流和个人中心进入。

操练场移动端支持：

- 创建、切换、删除服务端 session。
- 选择文生文、图生文、文生图、文生视频、图生视频模式。
- 按模式选择平台模型能力。
- 图生文/图生视频选择用户资产库图片。
- 运行结果写入消息流，生成资产回到资产库。

## 微信小程序构建

```bash
npm run build:weapp
```

构建产物输出到：

```text
dist/
```

小程序上线前需要按目标平台补充真实 AppID、域名白名单和上传配置。

## API 地址规则

移动端 API 地址在 `src/lib.js` 中解析：

1. 优先使用 `TARO_APP_API_BASE`。
2. H5 环境下按当前访问 hostname 推导 `http://<hostname>:18280`。
3. 非浏览器环境兜底为 `http://localhost:18280`。

示例：

```text
H5:  http://192.168.31.26:18283
API: http://192.168.31.26:18280
```

## H5 组件兼容

Taro H5 直接全量导入 `@tarojs/components` 时，部分环境会触发不必要组件的 custom element 注册错误。当前项目使用 `src/h5-components.jsx` 按需封装基础组件：

- `View`
- `Text`
- `Button`
- `Input`
- `Textarea`
- `Image`
- `Picker`

这样可以减少 H5 运行时崩溃面，并保持 Taro 页面渲染链路正常。

## Workspace 构建说明

项目在多端 workspace 下安装时，部分依赖会 hoist 到 `../node_modules`。`config/index.js` 使用 `require.resolve` 动态解析 Taro H5 runtime、React runtime 和 components，避免把别名写死到 `mobile/node_modules`。

## Workflow 保存要求

后端会校验 workflow graph 中的节点类型。移动端生成 workflow 时会为节点写入：

- `type`
- `componentKey`
- `component`
- `config`

不要删除这些字段，否则 `/api/workflows` 或 `/api/workflows/:id/draft` 会校验失败。

## 设计规范

- 以 iPhone 14 尺寸为移动端基础验收视口。
- 与官网、Dashboard、Admin 保持同一套 seeFactory 色系。
- 默认亮色体验，组件结构保留暗色主题扩展空间。
- 底部导航 icon 与文字在独立网格中居中对齐。
- 按钮、金额选项、输入框和 placeholder 保持统一水平基线。
- 移动端页面保持更松弛的间距和更大的圆角，避免小屏幕拥挤。

## 部署建议

- H5 推荐使用 Nginx 或容器静态服务托管 `dist/`。
- 平台默认 H5 外部端口为 `18283`。
- 不建议直接暴露 80/443 给应用容器。
- 确保 H5 域名或 IP 可以访问 Backend 的 `18280` 端口。

## 常见问题

### 页面打开是 nginx 默认页

确认部署镜像复制的是 `dist/` 目录，并且 Nginx 根目录已经清空旧默认页。

### 页面空白

检查浏览器控制台是否存在 Taro custom element 注册错误。当前代码通过 `h5-components.jsx` 避免全量组件导入。

### 注册或保存提示请求失败

确认登录页显示的 API 地址是否正确。登录页会展示当前 `API_BASE`，用于快速定位 H5 请求是否打到了错误主机。

## 远端仓库

```text
git@github.com:seeFactory/miniapp.git
```
