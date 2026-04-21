# SwayLab Mirror — 复刻

一个对 [swaylab.ai](https://swaylab.ai/) 智能体对话界面的复刻：顶部 ASCII 头像 + 等宽风格对话 + 预留 LLM 接口。

技术栈：Next.js 14 (App Router) · TypeScript · Tailwind CSS。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 部署到 Vercel

1. 推送到 GitHub 仓库。
2. 打开 [vercel.com](https://vercel.com/)，点击 **Add New → Project**，选择该仓库。
3. 保持默认配置（Next.js 会被自动识别），点击 **Deploy**。
4. 部署完成即可访问。无需任何环境变量即可运行（默认使用模拟回复）。

## 切换到真实 LLM

项目默认使用 `lib/mockReplies.ts` 中的规则进行模拟回复。要接入真实大模型：

1. 在 Vercel 项目设置中添加环境变量：
   - `USE_LLM=true`
   - `OPENAI_API_KEY=sk-...`（或其他提供商的 Key）
2. 打开 `app/api/chat/route.ts`，按照文件内 `TODO` 注释取消注释并替换为你选用的 Provider 调用代码。
3. 重新部署。

```bash
npm install openai   # 如使用 OpenAI
```

## 结构速览

```
app/
  layout.tsx            根布局（字体、元数据）
  page.tsx              主页面
  globals.css           全局样式与动画
  api/chat/route.ts     对话接口（模拟 ↔ LLM 切换点）
components/
  AsciiAvatar.tsx       ASCII 头像 + 扰动动画
  ChatContainer.tsx     消息状态、发送流、自动滚动
  ChatMessage.tsx       单条消息气泡
  ChatInput.tsx         输入框 + 发送按钮
lib/
  chatClient.ts         前端 fetch 封装
  mockReplies.ts        预设回复（关键词匹配）
```

## 自定义

- **修改欢迎语**：`components/ChatContainer.tsx` 的 `WELCOME_TEXT`。
- **替换人像视频 / 图片**：把你自己的素材放到 `public/`：
  - `public/avatar.mp4`（优先，推荐 ~512×512 灰度循环视频，1 MB 左右）
  - 或 `public/avatar.jpg`（静态图片备选）
  - 两者都没有时会自动使用内置的占位剪影。
- **调整人像效果**：`components/AsciiRenderer.tsx` 顶部的 `PARAMS` 常量
  控制对比度、字符密度、字形缩放、像素抖动强度等。字符密度阶梯在
  同文件的 `CHARSET` 常量里定义。
- **扩充预设回复**：`lib/mockReplies.ts` 的 `rules` 与 `fallback`。

## License

MIT。仅作技术演示用途，UI 设计版权归原站所有。
