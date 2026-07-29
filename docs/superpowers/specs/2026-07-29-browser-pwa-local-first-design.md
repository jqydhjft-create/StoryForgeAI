# StoryForge 本地优先 Web/PWA 设计

日期：2026-07-29

状态：用户已确认，待实施计划复核

## 1. 目标

将 StoryForge 的现有 React 创作界面和统一八阶段智能体工作流提供为可直接在浏览器运行的 Web/PWA 版本，不再要求 Electron 运行时。

网页版本采用本地优先模式：项目、工作流状态和用户自带的模型 API 配置只保存在当前浏览器；系统不新增账户、云端项目库、密钥代理或服务端同步。

## 2. 范围与非目标

### 2.1 本次范围

- 保留 React 界面、统一工作流、章节上下文构建、章节审阅、幕评分和全书审阅。
- 以浏览器 IndexedDB 持久化项目、工作流资产、摘要和模型配置。
- 支持创建、打开、编辑、删除及自动保存浏览器项目库中的项目。
- 支持导出完整项目 JSON 文件，以及导入同格式文件恢复项目。
- 支持导出小说文本；在支持 File System Access API 的浏览器中可选保存到用户授权的位置。
- 在浏览器直接调用用户配置的 OpenAI 或 DeepSeek 兼容 API。
- 对浏览器跨域限制、网络失败和无效模型输出提供明确错误信息。
- 保留桌面端代码与现有项目迁移逻辑，网页实现不删除 Electron 文件。

### 2.2 非目标

- 不提供用户账号、登录、多人协作、云端同步、团队权限、订阅或计费。
- 不将平台 API Key、用户 API Key 或项目正文发送到 StoryForge 自有服务器。
- 不实现任意本地目录的无提示读写；浏览器只能读取用户选择的导入文件，或在获得用户授权时写入文件。
- 不保证所有模型提供商都允许浏览器跨域直连；不使用绕过 CORS 的不安全方案。
- 不在本次改造中删除 Electron 主进程、preload 或桌面构建产物。

## 3. 方案选择

采用“纯静态 PWA + 用户自带 Key + IndexedDB”的方案。

```text
浏览器
  └─ StoryForge React PWA
       ├─ 浏览器项目库（IndexedDB）
       │   ├─ StoryProject
       │   ├─ Workflow state / artifacts / memory
       │   └─ Summary data
       ├─ 浏览器设置库（IndexedDB）
       │   └─ AiProviderConfigInput（用户 API Key）
       ├─ 文件导入 / 导出
       │   ├─ 完整项目 JSON
       │   └─ 小说 TXT
       └─ BrowserSkillRunner
            └─ 用户配置的 OpenAI / DeepSeek 兼容 API
```

该方案不含后端，因此可部署到任意静态托管服务。API Key 仅存在当前浏览器的 IndexedDB 中，并随模型请求直接发送给用户选择的提供商；StoryForge 不接收、转发或持有该 Key。

## 4. 持久化与文件交互

### 4.1 浏览器项目库

新增一个独立的浏览器项目仓储层，负责把完整 `StoryProject` 按稳定 ID 保存到 IndexedDB。它必须提供：

- 创建项目；
- 列出本地项目的 ID、名称和更新时间；
- 按 ID 加载项目；
- 原子保存完整项目；
- 删除项目；
- 导入经过结构检查的项目；
- 导出项目的可移植 JSON 负载。

网页项目不依赖磁盘路径。`StoryProject.rootPath` 在网页模式使用浏览器项目 ID 或空字符串，但不得再作为保存是否成功的判断条件。

### 4.2 导入、导出与备份

- 导出必须生成包含格式版本和完整 `StoryProject` 的 JSON 文件。
- 导入必须拒绝格式版本未知、根对象不是记录类型、或缺失必要项目字段的文件；失败时不得覆盖当前项目。
- 小说导出保留现有的按章节合并 TXT 内容。
- 浏览器使用 `Blob`、对象 URL 与下载链接触发下载，不依赖 Electron 的文件系统写入。
- 可选的 File System Access API 只能作为增强功能；不支持该 API 的浏览器仍可通过下载和文件选择器完成同一任务。

### 4.3 API Key 的本地边界

配置保存在 IndexedDB，并且设置界面继续使用密码输入框。界面不回显已保存 Key，只显示“已配置”和模型信息；用户可以覆盖或清除配置。

IndexedDB 防止 Key 被上传到 StoryForge 服务端，但它不是抵御同源恶意脚本、浏览器扩展或已被攻陷设备的保险库。应用必须避免把 Key 写入日志、导出项目、URL、错误详情或控制台输出。

## 5. 浏览器模型客户端

### 5.1 请求接口

现有 `StorySkillRequest`、`StorySkillResponse`、`StorySkillRunner` 和 `createSkillStoryPlugin` 保持为工作流边界。新增 `createBrowserSkillRunner`，通过 `fetch` 调用用户提供的兼容 Chat Completions 端点，并负责：

- 读取已保存的 provider、base URL、model 和 API Key；
- 组合系统提示、用户提示、JSON schema 提示与修复提示；
- 发送 `Authorization: Bearer <key>`；
- 将模型返回的 JSON 文本安全解析为 `StorySkillResponse.output`；
- 在首次输出不是合法 JSON 时，用已有 repair prompt 再尝试一次；
- 归一化网络、HTTP、跨域、空回复和 JSON 解析错误。

浏览器版工作流服务只在已配置浏览器模型客户端时注册真实 Skill Provider；未配置时保留 Mock Provider，供界面预览和测试使用。单次工作流不得混用真实 Provider 与 Mock Provider。

### 5.2 CORS 与失败反馈

浏览器不能绕过 API 服务端的跨域规则。若目标地址不接受浏览器请求，浏览器通常只会暴露 `TypeError: Failed to fetch`，无法可靠区分断网与 CORS。界面必须提示用户检查：网络、Base URL、模型名，以及提供商是否支持浏览器跨域调用；不得声称请求已抵达模型提供商。

为了减少误配置，设置页在“测试连接”时使用同一浏览器请求路径，并展示经脱敏后的简短诊断。

## 6. UI 与用户流程

### 6.1 启动页

启动页显示浏览器项目库中的最近项目，并提供：

- 新建项目；
- 打开本地项目；
- 导入项目备份；
- 删除本地项目（带确认）；
- 导出当前项目备份。

### 6.2 工作区

现有统一工作流操作保持不变。项目及工作流状态在成功的创建、确认、保存、删除、章节保存和摘要更新后自动写入 IndexedDB。保存失败要保留内存状态和用户编辑内容，并显示可重试错误。

设置页保留提供商配置与连接测试，移除只能由 Electron 执行的真实模型 benchmark、打开导出文件夹与选择项目父目录等控制。网页版本改用导出下载状态。

### 6.3 PWA

网页构建提供 Web App Manifest，使用户可以在支持的浏览器中安装为应用。离线时，已保存项目与界面可打开；需要模型调用的操作会显示网络不可用。首期不承诺离线缓存模型响应。

## 7. 模块边界

| 模块 | 网页版职责 |
| --- | --- |
| `browserProjectStore` | IndexedDB 项目 CRUD、导入导出数据校验。 |
| `browserAiConfigStore` | IndexedDB 中模型配置的读取、写入与清除。 |
| `browserSkillRunner` | 以 fetch 调用用户配置的兼容模型端点。 |
| `browserAppService` | 为 `App.tsx` 提供统一的项目、配置、导入导出与工作流依赖。 |
| `workflowService` | 保持唯一的渲染层工作流服务接口；注入浏览器 Provider。 |
| `App.tsx` | 继续编排 UI；根据运行环境选择浏览器服务，不直接访问 IndexedDB 或 fetch 协议。 |
| Electron 主进程 / preload | 保留给桌面构建，不作为网页入口依赖。 |

禁止在 `App.tsx` 中使用 `window.storyforge` 作为网页业务依赖。运行环境差异必须收敛在服务构造层。

## 8. 测试与验收

### 8.1 单元测试

- 浏览器项目仓储：创建、保存、加载、列表、删除、导出、合法导入、非法导入不覆盖已有项目。
- 浏览器配置仓储：配置读取、覆盖、清除，且导出项目不包含 API Key。
- 浏览器模型客户端：请求头、请求体、JSON 正常响应、修复重试、HTTP 失败和网络失败的脱敏错误。
- 浏览器运行环境服务：配置后使用真实 Provider，未配置时只使用 Mock Provider。
- 浏览器导出：生成 JSON 和 TXT 下载数据，而不依赖文件系统 IPC。

### 8.2 回归测试

- 现有统一工作流、章节上下文、审阅门禁和状态机测试继续通过。
- Electron 专属测试仍可在桌面构建中运行；网页构建不得导入 Electron、Node.js `fs` 或 `path`。
- `npm run typecheck`、`npm test`、`npm run build` 和 `git diff --check` 通过。

### 8.3 验收标准

1. `npm run dev` 打开后可以在浏览器完成项目创建、工作流生成与章节保存。
2. 刷新浏览器后，项目和工作流状态仍可加载。
3. 用户可导出完整备份、删除浏览器项目后再导入恢复。
4. API Key 不出现在导出 JSON、日志、URL 或普通 UI 文本中。
5. 配置为可跨域访问的 OpenAI / DeepSeek 兼容端点时，真实工作流使用该端点；无配置或请求失败时反馈清晰且不损坏项目。
6. 生产 `dist/` 可以部署到静态托管服务，并可作为 PWA 安装。
