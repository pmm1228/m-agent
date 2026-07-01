# mAgent

基于 Nuxt 4 的 AI 对话与待办助手，使用智谱 GLM 模型与 SQLite 持久化。

## 功能

- AI 对话（会话历史、侧栏管理、删除对话）
- 待办事项（增删改查、按用户隔离、筛选）
- 对话中可直接说「添加待办：买牛奶」创建任务
- Mac 风格 UI

## 环境变量

复制 `.env.example` 为 `.env` 并填写：

```bash
NUXT_SESSION_SECRET=your-session-secret
NUXT_ZHIPU_API_KEY=your-zhipu-api-key
NUXT_ZHIPU_MODEL=glm-4-flash
# NUXT_SEED_DEMO_USER=true
```

说明：

- `NUXT_SESSION_SECRET` 在生产环境必须设置为强随机字符串，否则登录会失败并提示配置缺失。
- `NUXT_SEED_DEMO_USER` 控制是否自动创建演示账号 `admin / 123456`。开发环境默认开启，生产环境默认关闭；如果确实需要生产演示账号，请显式设为 `true`。

## 开发

```bash
npm install
npm run dev
```

默认地址：`http://localhost:3001`

演示账号：`admin` / `123456`

## 生产构建

```bash
npm run build
npm run preview
```
