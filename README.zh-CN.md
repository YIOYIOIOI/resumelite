<div align="center">
  <h1>ResumeLite</h1>

  <p>本地优先的简历生成器，适合个人在桌面或浏览器中使用。</p>

  <p><a href="README.md">English</a> · <strong>简体中文</strong></p>

  <p>
    <a href="https://github.com/YIOYIOIOI/resumelite/actions/workflows/ci.yml"><img src="https://github.com/YIOYIOIOI/resumelite/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT">
  </p>
</div>

---

ResumeLite 是一个把一切都留在你本机的简历生成器。它有编辑器、模板、导入以及 PDF/DOCX/JSON 导出——但没有登录、没有后端 API、没有数据库，也没有托管服务。你的简历保存在本地 JSON 文件 `data/local/resumes.json` 中，由 Vite 服务器中间件读写（不在浏览器里）。

因为持久化依赖该中间件，请用 `pnpm dev` 或 `pnpm start`（vite preview）运行——纯静态构建没有 `/api/local` 接口，无法保存。请定期导出 JSON 备份，尤其是在换机器之前。

## 快速开始

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。日常本地使用不需要任何 `.env`、Docker、数据库或云凭证。

## 桌面版

ResumeLite 提供自包含的 Windows 桌面版——双击即可运行，无需手动启动服务器。数据存放在可执行文件同目录下的 `data` 文件夹里，所以整个程序是便携的：解压到任意位置、运行，删除文件夹即卸载。

```bash
pnpm --filter web package:desktop
```

打包产物位于 `apps/web/release-desktop/ResumeLite-<版本>-win-x64.zip`。

## 功能

- 本地简历面板：创建、编辑、复制、锁定/解锁、删除、排序、打标签。
- 自动保存到本地 JSON 文件，磁盘数据变化时实时刷新。
- 支持导入 Reactive Resume 和 JSON Resume 格式的 JSON 数据。
- PDF、DOCX、JSON 导出。
- 多套模板、页面设置、排版、布局、备注、自定义分节、富文本以及自定义 CSS。
- **项目经历库**（`/dashboard/experiences`）：记录你做过的项目，作为定制简历时可复用的素材。
- 双语界面——在侧边栏一键切换中英文（基于 Lingui）。

## 用 AI 助手安装并使用

有编码助手（Claude Code、Cursor、Codex 等）？把下面这段粘贴给它——它会自动克隆、安装、启动，然后帮你写简历：

```text
帮我安装并使用 ResumeLite：
1. 克隆 https://github.com/YIOYIOIOI/resumelite 并进入该目录。
2. 运行 "pnpm install"，然后用 "pnpm dev" 在后台启动并保持运行——应用通过本地服务器中间件保存数据，必须保持运行。
3. 确认 http://localhost:3000 能打开面板。
4. 阅读 AGENTS.md 和 .claude/skills/resumelite-workspace/SKILL.md，了解本地简历/经历 API 的用法。
5. 帮我在 /dashboard/experiences 录入项目经历，然后根据我给你的职位描述定制一份简历。
```

原理：本地 API 是纯 HTTP，助手可以直接读取你的经历库并写出定制简历。内置技能 `.claude/skills/resumelite-workspace/` 面向 Claude Code 说明了机制；`AGENTS.md` 为其他助手提供了相同的指引。

## 命令

| 任务 | 命令 |
| --- | --- |
| 安装依赖 | `pnpm install` |
| 启动开发服务器 | `pnpm dev` |
| 构建生产包 | `pnpm build` |
| 预览生产包 | `pnpm start` |
| 打包桌面版（Windows） | `pnpm --filter web package:desktop` |
| 类型检查 | `pnpm typecheck` |
| 运行测试 | `pnpm test` |
| 只读 Biome 检查 | `pnpm exec biome check .` |
| 格式化/修复 | `pnpm check` |

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 前端 | React 19、Vite、TanStack Router |
| 服务端状态 | TanStack Query |
| 客户端状态 | Zustand、Immer |
| 本地存储 | 经 Vite 中间件读写的本地 JSON 文件 |
| 桌面 | Electron |
| 样式 | Tailwind CSS |
| UI | Base UI + 共享的 shadcn 风格组件包 |
| 表单 | TanStack Form + Zod |
| 富文本 | Tiptap |
| 导出 | React PDF、DOCX 生成器、JSON |
| 国际化 | Lingui |

## 致谢与许可

ResumeLite 是 [Reactive Resume](https://github.com/AmruthPillai/Reactive-Resume)（作者 Amruth Pillai）的本地优先分支。它保留了简历编辑器和模板，去掉了托管服务栈（登录、数据库、服务端 API、Docker 以及公开分享层）。项目沿用原始的 [MIT 许可证](./LICENSE)——再分发修改版时请保留上游署名。
