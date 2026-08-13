# 灯塔 · Douyin Public Monitor

Internal weekly monitor for metrics visibly displayed on public Douyin account and video pages. It tracks videos for 90 days and stores weekly cumulative snapshots for likes, collections, comments, and visible shares.

## 在 Mac mini 上首次运行

以下命令都在 Terminal 中执行，并且先进入项目目录：

```bash
cd /Users/binjieye/Projects/douyin-crawler
cp .env.example .env.local
npm install
npm run db:migrate
npm run auth:create -- admin 'replace-with-a-long-password'
npm run collect:login
npm run build
npm run start
```

在浏览器打开 `http://localhost:3000`。`npm run collect:login` 会打开 Chrome；完成抖音登录后回到 Terminal 按 Enter，登录状态会持久化到 `playwright-profile/`。

如需开发模式（改代码后自动刷新），停止 `npm run start`，然后运行：

```bash
cd /Users/binjieye/Projects/douyin-crawler
npm run dev
```

不要同时运行 `npm run dev` 和 `npm run start`，也不要在开发服务运行时执行生产构建；它们会共用 `.next/` 目录。

数据库初始为空。从“账号”页面粘贴抖音主页链接后，应用会立即在后台启动该账号的首次采集，并用主页上可见的名称替换临时名称。

如果此时已有采集任务占用了浏览器，新账号会保持“等待中”，采集器会在退出前处理它。遇到登录挑战或会话过期时，系统会显示真实失败状态，不会生成虚假的基线数据。

## 日常启动和采集

每次重启 Mac 或手动重新启动服务：

```bash
cd /Users/binjieye/Projects/douyin-crawler
npm run start
```

`npm run start` 使用上一次 `npm run build` 的生产构建。代码发生变化后，先执行 `npm run build` 再启动。手动采集所有已启用账号：

```bash
cd /Users/binjieye/Projects/douyin-crawler
npm run collect
```

也可以在页面右上角点击“立即采集”。如果抖音登录过期，重新执行 `npm run collect:login`。

采集器只读取页面渲染后公开可见的值。遇到登录挑战、验证码或系统性页面变化时会停止并记录失败，不包含绕过机制。

## 数据库和数据持久化

数据存储在项目目录下的 SQLite 文件：

```text
/Users/binjieye/Projects/douyin-crawler/data/douyin-monitor.db
```

主要表包括账号、视频、每次指标快照、采集运行记录、采集错误和内部登录用户。SQLite 使用 WAL 模式和外键约束。

正常重跑 `npm install`、`npm run db:migrate`、`npm run dev`、`npm run build`、`npm run start` 或 `npm run collect` 都不会清空数据库。数据只会在以下情况下丢失或看起来消失：

- 手动删除或覆盖 `data/douyin-monitor.db`；
- 修改 `DATABASE_PATH`，让程序连接到另一个数据库；
- 不在项目目录运行，导致相对数据库路径指向别处；
- 在界面中确认“移除”账号，此操作会永久删除该账号、视频、指标快照和关联错误。

“暂停”账号不会删除历史数据。建议在升级代码或移除账号前备份：

```bash
cd /Users/binjieye/Projects/douyin-crawler
npm run db:backup
```

备份写入 `data/backups/`，自动保留最近 30 份。

## 自动运行

`ops/` 中提供三个 macOS `launchd` 模板：常驻仪表盘、每周采集和每日备份。将模板中的 `REPLACE_PROJECT_PATH` 替换为 `/Users/binjieye/Projects/douyin-crawler`，复制到 `~/Library/LaunchAgents/` 后再用 `launchctl` 加载。示例采集时间为每周日 09:00，备份时间为每天 03:30。

## 验证代码

```bash
npm test
npm run lint
npm run format:check
npm run build
```

范围、数据质量规则和合规边界见[设计说明](./docs/plans/2026-08-13-douyin-public-account-monitor-design.md)。
