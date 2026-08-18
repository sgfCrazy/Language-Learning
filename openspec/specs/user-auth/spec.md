## Purpose

让用户在 Web 与微信小程序上完成身份认证并维持会话，为练习、进度、个性化数据提供统一的用户身份基础。

## Requirements

### Requirement: UA-001 微信登录

系统 SHALL 支持微信登录作为主要登录方式。微信小程序端通过 `wx.login` 获取 code 换取 openid；Web 端通过微信扫码登录。登录成功后系统 SHALL 创建或匹配本地用户并签发 JWT。

#### Scenario: 小程序首次微信登录
- **WHEN** 用户在小程序端点击"微信登录"并授权
- **THEN** 系统用 `wx.login` 的 code 向微信换取 openid 与 session_key，创建新用户（若不存在），签发 JWT 并返回给客户端持久化

#### Scenario: Web 微信扫码登录
- **WHEN** 用户在 Web 端用微信 App 扫描登录二维码并确认
- **THEN** 系统通过微信 OAuth 回调获取 unionid/openid，匹配或创建用户，签发 JWT

#### Scenario: 已存在用户再次登录
- **WHEN** 同一微信用户再次登录
- **THEN** 系统 MUST 复用既有用户记录，不创建重复账号，并签发新 JWT

### Requirement: UA-002 邮箱密码登录（辅助）

系统 SHALL 提供邮箱 + 密码的辅助登录与注册，供无微信账号或 Web 桌面场景使用。密码 MUST 以加盐哈希存储，禁止明文。

#### Scenario: 邮箱注册
- **WHEN** 用户提交有效邮箱与符合强度要求的密码
- **THEN** 系统创建用户、生成加盐哈希存储密码，签发 JWT

#### Scenario: 邮箱登录失败
- **WHEN** 用户提交的邮箱/密码不匹配
- **THEN** 系统 SHALL 返回统一的"邮箱或密码错误"错误，且不泄露具体是哪一项错误

### Requirement: UA-003 JWT 会话与刷新

系统 SHALL 使用 JWT 进行无状态会话。Access token 有效期短，refresh token 有效期长且可吊销。

#### Scenario: token 过期自动刷新
- **WHEN** 客户端携带过期的 access token 与有效的 refresh token 请求
- **THEN** 系统 SHALL 颁发新的 access token，客户端无感知地重试原请求

#### Scenario: refresh token 被吊销
- **WHEN** 用户登出或修改密码
- **THEN** 系统 MUST 吊销其 refresh token，使其不再可用

### Requirement: UA-004 多端会话隔离

系统 SHALL 区分登录来源端（web / miniapp），同一用户可在多端同时在线，互不踢出。

#### Scenario: 同一用户多端同时登录
- **WHEN** 用户在 Web 与小程序同时登录
- **THEN** 两端各自持有有效会话，互不影响

### Requirement: UA-005 多端 API 行为一致性

认证相关 REST 接口 SHALL 在 Web 与小程序端表现一致；仅登录触发方式与平台凭证获取流程不同。小程序端 MUST 通过平台适配层获取 `wx.login` code，禁止业务代码直接调用小程序全局 API。

#### Scenario: 受保护接口跨端调用
- **WHEN** Web 端与小程序端携带有效 JWT 调用同一受保护接口
- **THEN** 两端得到一致的响应结构
