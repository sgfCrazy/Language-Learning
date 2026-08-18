# 小程序端手工验收清单（bootstrap-mvp-foundation）

在微信开发者工具中导入 `apps/web-taro/dist`（运行 `pnpm -F @app/web-taro build:weapp` 后生成），逐项验证：

## 环境
- [ ] 后端已启动：`pnpm dev:server`（默认 :3000，DATABASE_URL 指向本地 SQLite，已 seed）
- [ ] 小程序开发者工具中关闭"域名校验"（开发期），或把 `http://localhost:3000` 加入 request 合法域名

## 登录（user-auth）
- [ ] 首页点"去登录"进入登录页
- [ ] 邮箱注册：填写昵称/邮箱/密码（≥8 位）→ 注册成功，返回首页显示 userId
- [ ] 邮箱登录：错误密码提示"邮箱或密码错误"
- [ ] 微信登录：点"微信登录"→ 弹出授权 → 成功后显示 userId（需后端配置真实 WX_APPID/WX_SECRET）
- [ ] 杀进程后重开小程序：会话保持（init() 用本地 token 恢复）

## 课程商城（course-catalog）
- [ ] 首页点"课程商城"→ 列表显示种子课程包
- [ ] 难度筛选"beginner"→ 仅显示初阶包
- [ ] 搜索"PTE"→ 命中 PTE 课程包
- [ ] 进入课程包详情 → 显示课程列表 + "加入学习"按钮

## 练习（practice-engine 中译英）
- [ ] 加入学习后点课程 → 进入练习页
- [ ] 显示中文句意 + 候选词块
- [ ] 点对：进入下一步，播放音效（适配层）
- [ ] 点错：标红"再试一次"，震动，尝试次数+1
- [ ] 完成一句：自动进入下一句，进度上报后端
- [ ] 跳过：记录为未掌握，进入下一句

## 进度追踪（progress-tracking）
- [ ] 首页"成长记录"→ 显示成长曲线/热力图数据（与后端 /progress/growth、/progress/heatmap 一致）
- [ ] 断网完成一题 → 联网重开 → 队列补传成功（/progress/records 出现记录）

## 跨端一致性
- [ ] Web 端（`pnpm dev:web`）跑通同一闭环，进度与小程序一致
