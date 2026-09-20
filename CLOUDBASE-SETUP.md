# CloudBase 接入准备

主页新增“管理”入口，`admin.html` 已接入 CloudBase SDK，提供登录、退出、保存测试记录和重新读取功能。尚未完成真实账号登录与数据库权限联调。

已记录环境 ID：`homer-tools-d9gxx8vmse2a53529`。
本地 `cloudbase.config.js` 按创建页面的选择配置为上海 (`ap-shanghai`)；数据库按 PostgreSQL 方案接入。尚未对远端环境进行验证。

## 1. 创建环境

打开 https://console.cloud.tencent.com/tcb ，登录腾讯云账号，创建 CloudBase 环境。
面向大陆用户选择可用的大陆地域。先核对试用资格、套餐价格和续费规则，再决定是否开通。
记录环境 ID 和实际地域。不要把腾讯云 SecretId、SecretKey、服务端 API Key 或密码放进前端代码。

## 2. 配置安全来源

在环境的安全来源设置中添加实际使用的来源：

- `127.0.0.1:4173`：当前本地预览
- `localhost:4173`：使用 localhost 预览时
- `homerzh.github.io`：GitHub Pages 上线地址

安全来源用于允许网页调用服务，不能代替数据库权限校验。

## 3. 创建测试表

在 CloudBase 控制台的 SQL 型数据库中打开 SQL 编辑器，执行 `cloudbase/setup.sql` 全文一次。
脚本使用事务创建新表 `public.toolbox_connection_checks`，启用 RLS，撤销匿名访问，只允许用户 ID `2101780961169797122` 查询和插入内容。
它不会修改既有业务表；重复执行会因同名表存在而失败并回滚，不要为重试删除已有表。
如控制台报告 DDL 权限不足，请保留错误并核对控制台 SQL 执行入口，不要关闭 RLS 或改为公开读写。

## 4. 本地联调

运行 `npm run preview`，打开 `http://127.0.0.1:4173/admin.html`。
在网页自行输入 homer 的密码（不要写入代码或发到聊天中）。
保存一条无敏感信息的测试内容，刷新页面并重新读取，确认数据持久保存。
最后退出登录，验证表的匿名查询和写入均被数据库拒绝；使用其他用户身份验证无法读写。
当前尚未执行远端 SQL 或这些真实权限测试，页面隐藏管理区不构成权限验证。

## 5. 权限注意事项

确认环境开通的数据库类型及身份认证版本后，再接入对应 SDK。
先配置用户名密码登录和单个管理员 homer，不开放网站注册入口；同时核对平台注册策略，不能只隐藏按钮。
管理员权限绑定该用户的固定 UID，不能仅凭用户在页面中填写的名字判断权限。
数据库默认拒绝未经授权的读取和写入；仅管理员 UID 获得测试记录访问权限。
在真实环境验证登录、保存、重新加载后读取，以及未登录访问被拒绝。
未完成这些检查前，不把测试界面描述成已接通数据库。

## 官方资料

- SDK 初始化：https://docs.cloudbase.net/api-reference/webv3/initialization
- 安全来源：https://docs.cloudbase.net/envconfig/security/intro

`cloudbase.config.js` 包含公开环境标识、管理员 UID 和 Publishable Key，不含管理员密码或服务端密钥。UID 在 JavaScript 中必须保持字符串，避免长整数精度丢失。

修改 `src/admin.js` 后执行 `npm run build`，将更新后的 `assets/admin.js` 一起推送。GitHub Pages 无需安装依赖即可使用提交的静态文件。
