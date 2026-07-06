<div align="center">
  <h1>ResumeLite</h1>

  <p>本地优先的个人简历管理系统——沉淀你做过的每一段经历，再基于它定制一份份简历。</p>

  <p><a href="README.md">English</a> · <strong>简体中文</strong></p>

  <p>
    <a href="https://github.com/YIOYIOIOI/resumelite/actions/workflows/ci.yml"><img src="https://github.com/YIOYIOIOI/resumelite/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT">
  </p>
</div>

---

ResumeLite 不只是一个简历编辑器——它是一个个人简历管理系统。你可以把做过的**项目经历汇总成一个经历库**（记录你真正做过什么的唯一事实源），再据此为每一个投递的岗位定制专属简历。一切都在你自己的机器上运行，每一份简历和经历都保存在本地 JSON 文件里，绝不离开你的电脑。

你的数据由本地服务器读写，所以用 `pnpm dev` 或 `pnpm start`（vite preview）启动，编辑时会随手保存。记得偶尔导出一份 JSON 备份，尤其是在换机器之前。

## 快速开始

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可开始——本地开箱即用，无需额外配置。

## 桌面版

ResumeLite 提供自包含的 Windows 桌面版——双击即可运行。数据存放在可执行文件同目录下的 `data` 文件夹里，所以整个程序是便携的：解压到任意位置、运行，删除文件夹即卸载。

```bash
pnpm --filter web package:desktop
```

打包产物位于 `apps/web/release-desktop/ResumeLite-<版本>-win-x64.zip`。

## 功能

- **项目经历库**（`/dashboard/experiences`）——把你做过的每一个项目集中记录在一处：写简历时的事实素材源。
- **定制简历**——针对某个具体岗位快速生成一份简历，复用你已经记录好的经历。
- 简历面板：创建、编辑、复制、锁定/解锁、删除、排序、打标签。
- 多套模板、页面设置、排版、布局、备注、自定义分节、富文本以及自定义 CSS。
- **分享模板**——把简历的外观导出成文件、导入别人的，或在社区画廊里浏览共享的设计。
- 自动保存到本地 JSON 文件，磁盘数据变化时实时刷新。
- 导入 Reactive Resume 和 JSON Resume；导出 PDF、DOCX、JSON。
- 双语界面——在侧边栏一键切换中英文（基于 Lingui）。

## 用 AI 助手安装

有编码助手（Claude Code、Cursor、Codex 等）？把下面这段粘贴给它，让它帮你克隆、安装并启动项目：

```text
帮我安装 ResumeLite：
1. 克隆 https://github.com/YIOYIOIOI/resumelite 并进入该目录。
2. 运行 "pnpm install"，然后用 "pnpm dev" 在后台启动并保持运行——应用通过本地服务器中间件保存数据，必须保持运行。
3. 打开 http://localhost:3000 确认面板能加载，并简单介绍一下这个项目是做什么的。
```

跑起来之后，再让助手读 `AGENTS.md` 和 `.claude/skills/resumelite-workspace/`，它就能帮你录入经历、定制简历。

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

ResumeLite 是 [Reactive Resume](https://github.com/AmruthPillai/Reactive-Resume)（作者 Amruth Pillai）的本地优先分支，专注于在你自己的机器上私密运行。项目沿用原始的 [MIT 许可证](./LICENSE)——再分发修改版时请保留上游署名。
