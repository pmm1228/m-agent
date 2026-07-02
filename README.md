# mAgent

mAgent 是一个基于 Nuxt 4 + Vue 3 的本地 AI 工作区示例项目，集成了 AI 对话、会话管理和待办事项管理。项目使用 SQLite 持久化数据，支持接入智谱 GLM 和火山方舟豆包模型，整体界面采用 macOS 风格的工作区体验。

## 功能特性

- AI 对话：支持多会话、上下文历史、Markdown 回复渲染。
- 流式输出：AI 回复会边生成边展示，降低等待整段回复的体感延迟。
- 消息可靠性：消息带 `status` 状态，AI 失败会落库，失败回复可在界面中重试。
- 会话列表优化：会话列表只加载摘要和最后一条消息，进入会话后再加载完整消息。
- 待办管理：支持待办的创建、编辑、完成、删除和筛选。
- 对话创建待办：在聊天中输入类似「添加待办：买牛奶」即可自动创建任务。
- 登录与会话：使用 HttpOnly Cookie 保存登录态，默认会话有效期 7 天。
- 安全防护：登录失败限流、输入长度限制、AI 请求超时、基础安全响应头。
- 本地持久化：SQLite 数据库文件位于 `.data/magent.db`。

## 技术栈

- Nuxt 4
- Vue 3
- TypeScript
- Element Plus
- better-sqlite3
- Markdown It
- 智谱 GLM API / 火山方舟豆包 API

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量示例文件：

```bash
cp .env.example .env
```

填写 `.env`：

```bash
# 会话加密密钥，生产环境必须使用强随机字符串
NUXT_SESSION_SECRET=your-session-secret

# 当前使用的大模型提供方：zhipu 或 doubao
NUXT_AI_PROVIDER=doubao

# 智谱 AI API Key，在 https://open.bigmodel.cn 获取
NUXT_ZHIPU_API_KEY=your-zhipu-api-key

# 可选，默认 glm-4-flash
NUXT_ZHIPU_MODEL=glm-4-flash

# 火山方舟豆包 API Key，在火山方舟控制台获取
NUXT_DOUBAO_API_KEY=your-doubao-api-key

# 火山方舟模型/推理接入点 ID，例如 ep-xxxxxxxxxxxxxxxx
NUXT_DOUBAO_MODEL=your-doubao-endpoint-id

# 可选，默认火山方舟 OpenAI 兼容接口
NUXT_DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3/chat/completions

# 可选，默认火山方舟 Responses 接口；开启联网搜索时使用
NUXT_DOUBAO_RESPONSES_URL=https://ark.cn-beijing.volces.com/api/v3/responses

# 是否启用豆包联网搜索；true 时走 Responses + web_search，false 时走普通对话
NUXT_DOUBAO_WEB_SEARCH=false

# 是否自动创建演示账号 admin / 123456
# 开发环境默认开启，生产环境默认关闭
# NUXT_SEED_DEMO_USER=true
```

默认对话模型使用豆包，需要填写 `NUXT_DOUBAO_API_KEY` 与 `NUXT_DOUBAO_MODEL`。智谱相关配置可以继续保留，之后把 `.env` 中的 `NUXT_AI_PROVIDER` 改为 `zhipu` 即可切回原模型。

### 3. 启动开发服务

```bash
npm run dev
```

默认访问地址：

```text
http://localhost:3001
```

开发环境默认演示账号：

```text
用户名：admin
密码：123456
```

## 常用命令

```bash
# 启动开发服务
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview

# 静态生成
npm run generate
```

## 环境变量说明

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `NUXT_SESSION_SECRET` | 生产必填 | 开发环境内置临时值 | Cookie 会话签名密钥，生产环境必须设置为强随机字符串。 |
| `NUXT_AI_PROVIDER` | 否 | `doubao` | 当前使用的大模型提供方，支持 `zhipu`、`doubao`。 |
| `NUXT_ZHIPU_API_KEY` | 使用智谱时必填 | 空 | 智谱 API Key。未配置时，普通 AI 回复会失败并显示可重试状态。 |
| `NUXT_ZHIPU_MODEL` | 否 | `glm-4-flash` | 使用的智谱模型名称。 |
| `NUXT_DOUBAO_API_KEY` | 使用豆包时必填 | 空 | 火山方舟 API Key。 |
| `NUXT_DOUBAO_MODEL` | 使用豆包时必填 | 空 | 火山方舟模型或推理接入点 ID，例如 `ep-xxxxxxxxxxxxxxxx`。 |
| `NUXT_DOUBAO_BASE_URL` | 否 | `https://ark.cn-beijing.volces.com/api/v3/chat/completions` | 火山方舟 OpenAI 兼容 Chat Completions 地址。 |
| `NUXT_DOUBAO_RESPONSES_URL` | 否 | `https://ark.cn-beijing.volces.com/api/v3/responses` | 火山方舟 Responses 地址，启用联网搜索时使用。 |
| `NUXT_DOUBAO_WEB_SEARCH` | 否 | `false` | 是否启用豆包联网搜索。设为 `true` 时使用 Responses + `web_search` 工具。 |
| `NUXT_SEED_DEMO_USER` | 否 | 开发开启，生产关闭 | 是否自动创建 `admin / 123456` 演示账号。 |

生成生产会话密钥示例：

```bash
openssl rand -base64 32
```

## 项目结构

```text
m-agent/
├─ app/
│  ├─ assets/css/          # 全局样式和工作区样式
│  ├─ components/          # 通用组件和侧边栏组件
│  ├─ composables/         # 前端状态管理
│  ├─ layouts/             # 工作区布局
│  ├─ middleware/          # 页面鉴权中间件
│  └─ pages/               # 登录、对话、待办页面
├─ server/
│  ├─ api/                 # Nitro API 路由
│  ├─ middleware/          # 服务端中间件
│  └─ utils/               # 数据库、鉴权、AI、待办等工具
├─ public/                 # 静态资源
├─ .data/                  # SQLite 数据库目录，本地运行后生成
├─ nuxt.config.ts
└─ package.json
```

## 核心接口

### 认证

- `POST /api/auth/login`：登录。
- `POST /api/auth/logout`：退出登录。
- `GET /api/auth/me`：获取当前用户。

### 对话

- `GET /api/conversations`：获取会话列表摘要，不返回全量消息。
- `POST /api/conversations`：创建新会话。
- `GET /api/conversations/:id`：获取单个会话详情和完整消息。
- `DELETE /api/conversations/:id`：删除会话。
- `POST /api/agent/chat`：发送聊天消息。
- `POST /api/messages/:id/retry`：重试失败的 AI 回复。

### 待办

- `GET /api/todos`：获取待办列表。
- `POST /api/todos`：创建待办。
- `PATCH /api/todos/:id`：更新待办。
- `DELETE /api/todos/:id`：删除待办。

## 数据与持久化

默认数据库路径：

```text
.data/magent.db
```

主要数据表：

- `users`：用户。
- `conversations`：会话。
- `messages`：消息，包含 `role`、`content`、`status`、`error` 等字段。
- `todos`：待办。

消息状态说明：

- `completed`：消息已完成。
- `pending`：前端临时生成中状态。
- `failed`：AI 回复失败，已保存错误信息，可点击重试。

如果存在旧的 `.data/demo.db`，项目启动时会尝试补迁移历史对话到 `.data/magent.db`。

## AI 对话说明

- 模型请求默认使用最近 20 条已完成消息作为上下文。
- 普通对话和失败重试均支持流式输出；豆包普通对话会关闭思考模式以减少首字等待。
- 当 `NUXT_DOUBAO_WEB_SEARCH=true` 且当前提供方为豆包时，AI 请求会使用火山方舟 Responses 接口并携带 `web_search` 工具。
- AI 请求超时时间为 60 秒。
- 当 AI 调用失败时，用户消息仍会保存，助手消息保存为 `failed`。
- 重试失败消息时，不会重复插入用户消息，而是在原失败助手消息上更新结果。
- 待办创建指令会优先走本地解析，不依赖大模型调用。

## 安全与限制

- 登录失败限流：同一 IP 和用户名 10 分钟内失败 5 次后锁定 5 分钟。
- 聊天消息最大长度：4000 字符。
- 待办标题最大长度：120 字符。
- 会话标题最大长度：80 字符。
- 生产环境必须设置 `NUXT_SESSION_SECRET`。
- 生产环境默认不会创建演示账号，避免暴露 `admin / 123456`。

## 生产部署

构建：

```bash
npm run build
```

运行构建产物：

```bash
NUXT_SESSION_SECRET=your-strong-secret \
NUXT_AI_PROVIDER=doubao \
NUXT_DOUBAO_API_KEY=your-doubao-api-key \
NUXT_DOUBAO_MODEL=your-doubao-endpoint-id \
node .output/server/index.mjs
```

部署时建议：

- 将 `.data/magent.db` 放在可持久化磁盘中。
- 不要提交 `.env`、`.data/`、`.output/` 到仓库。
- 为生产环境配置强随机 `NUXT_SESSION_SECRET`。
- 如果使用反向代理，确保正确转发 Cookie 和 `x-forwarded-for`。

## Git 忽略建议

项目应忽略本地运行产物和敏感配置：

```text
.env
.data/
.nuxt/
.output/
node_modules/
```

## 许可证

当前项目未声明许可证。如需开源发布，建议补充 `LICENSE` 文件。
