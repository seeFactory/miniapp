# seeFactory Miniapp

seeFactory 移动端应用，基于 Taro + React 实现。当前支持 H5 构建，并保留微信小程序构建入口。移动端覆盖 Dashboard 的核心职能：控制台、工作流、创意工坊、调用记录、钱包账单、模型、资产和个人中心。

## 功能范围

- 登录、注册、退出和个人资料维护。
- 移动控制台：首页摘要、余额、工作流、任务、资产和快捷入口。
- No-code workflow：表单化配置链路、纵向节点预览、保存草稿、校验、运行、发布、导出。
- 创意工坊：公开样例浏览、运行、克隆。
- 调用记录：任务列表、状态筛选、任务详情和事件查看。
- 钱包账单：充值订单、余额流水、模型扣费记录。
- 模型测试台：模型能力列表和测试调用。
- 资产库：资产列表和外部 URL 资产登记。

## 技术栈

- Taro 4.0.8
- React 18
- Webpack 5
- H5 hash router

## 目录结构

```text
.
├── config/
│   └── index.js
├── public/
│   └── brand/
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
└── package.json
```

## 页面清单

| 路径 | 说明 |
| --- | --- |
| `pages/home/index` | 移动控制台首页 |
| `pages/workflows/index` | workflow 控制台 |
| `pages/workshop/index` | 创意工坊 |
| `pages/tasks/index` | 调用记录 |
| `pages/profile/index` | 我的账户 |
| `pages/login/index` | 登录注册 |
| `pages/wallet/index` | 钱包账单 |
| `pages/models/index` | 模型测试台 |
| `pages/assets/index` | 资产库 |

## 环境要求

- Node.js 20 或更高版本。
- seeFactory Backend 已启动，默认生产端口为 `18280`。

## 安装

```bash
npm install
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
2. H5 环境下按当前访问域名推导 `http://<hostname>:18280`。
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

## 工作流保存要求

后端会校验 workflow graph 中的节点类型。移动端生成 workflow 时会为节点写入：

- `type`
- `componentKey`
- `component`
- `config`

不要删除这些字段，否则 `/api/workflows` 或 `/api/workflows/:id/draft` 会校验失败。

## 部署建议

- H5 推荐使用 Nginx 或容器静态服务托管 `dist/`。
- 平台默认 H5 外部端口为 `18283`。
- 不建议直接暴露 80/443 给应用容器。
- 需要保证 H5 域名/IP 可访问 Backend 的 `18280` 端口。

## 常见问题

### 页面打开是 nginx 默认页

确认部署镜像复制的是 `dist/` 目录，并且 Nginx 根目录已经清空旧默认页。

### 页面空白

检查浏览器控制台是否存在 Taro custom element 注册错误。当前代码通过 `h5-components.jsx` 避免全量组件导入。

### 注册或保存提示请求失败

确认页面显示的 API 地址是否正确。登录页会展示当前 `API_BASE`，用于快速定位 H5 请求是否打到了错误主机。

## 代码提交

当前仓库远端：

```text
git@github.com:seeFactory/miniapp.git
```
