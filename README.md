# Stellar Portfolio

React + TypeScript + Vite + Tailwind CSS 的个人科研与开发作品集。公开页面现从 Supabase 读取，后台通过 Supabase Auth 和 admin_users 白名单管理内容；没有本地业务数据回退。

## 1. 配置与启动

你已说明数据库初始化、RLS 和管理员账号/白名单已完成。本轮不重跑 schema.sql、不修改远程结构。

1. 将 .env.example 复制为 .env.local（若已存在，直接编辑，不要覆盖）。
2. 填写 VITE_SUPABASE_URL 与 VITE_SUPABASE_PUBLISHABLE_KEY，后者使用 sb_publishable_ 开头的公开 key。
3. 重启 Vite。环境变量在构建时注入，修改后需重启或重新构建。

~~~dotenv
VITE_SUPABASE_URL=https://你的项目标识.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=你的公开publishable-key
~~~

上面只是说明，不能照抄。绝不要填写 secret/service_role key、数据库密码或登录密码；不要把 .env.local 提交到仓库。

~~~powershell
cd D:\AIProjects\StellarPortfolio
npm.cmd ci
npm.cmd run dev
~~~

已有依赖时直接 npm.cmd run dev。访问 http://127.0.0.1:5173/ 。若已有服务运行，直接刷新，不要重复占用 5173。Ctrl+C 停止服务。

管理员手动访问 http://127.0.0.1:5173/admin/login 。公开导航不展示后台入口。无配置时公开页面和后台都会明确提示，不显示原来的本地资料来冒充联网成功。

## 2. 页面与真实保存

- 公开页：/、/#about、/#skills、/#projects、/#contact、/blog、/blog/:slug。
- 后台：/admin/login、/admin、/admin/profile、/admin/skills、/admin/projects、/admin/posts。
- 只允许邮箱密码登录，无注册和自助授权入口。登录成功还需查询本人 admin_users 行；路由守卫是交互控制，RLS 是真正的安全边界。
- SDK 按默认机制持久化认证会话并自动刷新；业务内容不写 localStorage。
- 表单包含资料与可增删教育/个人经历、技能 CRUD、项目 CRUD、论文分节、普通 Markdown 札记、预览及发布状态。
- 新内容默认草稿。保存已发布内容直接更新线上；撤回后后续公开查询不可读。公开页面进入/刷新时重新查询。
- 个人资料仅编辑/新增和撤回，不在 UI 中提供删除；其余三类有删除确认。
- 更新/删除带原 updated_at 条件，零行返回视为冲突、删除或权限变化；失败保留当前输入，不伪报成功。
- 论文出版日期与网站发布时间分离；未提供的邮箱、DOI、期刊日期和外链保留 null。

## 3. 数据结构和代码位置

以 [supabase/schema.sql](supabase/schema.sql) 为字段和 RLS 依据。

- src/types/database.ts：依据当前 SQL 编写的数据库行/写入类型，后续 schema 变更需同步。
- src/lib/supabase.ts：唯一客户端、环境校验和请求超时。
- src/services/mapping.ts：运行时字段校验、snake_case 到领域类型映射。
- src/services/supabaseRepository.ts：公开读取，所有内容请求显式过滤 status=published。
- src/services/admin.ts：管理员重新验证与真实 INSERT/UPDATE/DELETE，数据库确认后才返回成功。
- src/features/auth/：会话恢复、验证和白名单状态；Auth 回调内不执行异步数据库查询。
- src/features/admin/：表单定义、与 schema 对应的输入验证、经历编辑、未保存提醒。
- src/pages/admin/：登录、侧栏、概览和管理页。
- src/data/mockContent.ts / mockRepository.ts：保留供历史内容与测试夹具参考，不再从生产读取入口导入。

profile.education 保持 JSON 数组；projects.details 为段落数组；publications 的四个介绍分节还原为现有 Markdown 详情。content_type=post 时清空论文专用列，使用 content_markdown；publication 时保存分节且 content_markdown=null。

## 4. 本地检查

~~~powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
~~~

生产本地预览：npm.cmd run preview，访问 http://127.0.0.1:4173/ 。

浏览器测试使用独立的 node_modules/.cache/stellar-e2e-site 构建目录、测试专用虚构 URL/key 和 HTTP 响应替身，不会使用 .env.local 的实际项目值，也不会写入远程 Supabase。

~~~powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm.cmd run test:e2e
~~~

无 Chrome 时先 npx.cmd playwright install chromium，再移除 PLAYWRIGHT_CHANNEL 环境变量。测试会临时启动固定 4173 端口，运行前应关闭占用此端口的预览服务。测试夹具不属于生产后端或权限实现；其通过结果只证明本地界面与请求处理，不证明真实 RLS。

## 5. 你填写环境变量后的手动验收

以下尚未由代理在真实项目验证，不能以本地测试替代：

1. 匿名打开首页和论文详情，确认读取数据库的真实内容；直接访问后台被引导登录。
2. 管理员登录，刷新 /admin/projects 仍保持会话；退出后不能进入后台或写入。
3. 创建一个不在白名单中的测试账号，登录后应显示无管理员权限；直接调用内容写接口也应被 RLS 拒绝。
4. 分别编辑资料、技能、项目和现有论文；保存后刷新后台，再用另一无痕浏览器刷新公开页面，确认已发布内容一致。
5. 创建草稿札记，匿名列表和 slug 详情均不可读；发布后可读，撤回后再次不可读；检查首次网站发布时间不被重复改写。
6. 删除测试技能/项目/札记，确认所有后续查询不再返回；测试不要删除真实成果。检查删除确认与取消行为。
7. 断网提交、令牌失效和多标签页并发修改时不能误报成功；输入应尽可能保留，冲突后重新核对再编辑。
8. 登录后的管理员在公开页面也只能看到公开列表，不能混入后台草稿。
9. 使用 [Supabase SETUP](supabase/SETUP.md) 的角色与 API 方法逐表验证 RLS、白名单不能自行提权。不要重跑初始 schema。

远程步骤在你本地进行，无需把数据库密码、高权限 key 或管理员密码交给代理。当前未部署到 Vercel、未推送 GitHub。



## 本轮本地验证结果

TypeScript、ESLint、生产构建与 11 项单元测试通过。21 项前后台浏览器场景在桌面、平板、手机视口已覆盖并通过；其中一项平板测试修正路由就绪等待后单独复测通过。浏览器使用独立 HTTP 测试响应，未连接真实 Supabase，因此不代表远程登录、RLS、持久化和双浏览器一致性已通过。已检查后台截图与横向溢出，并扫描 src 中敏感配置字面量，未发现真实高权限 key、数据库连接密码或硬编码令牌。

Supabase 官方参考：[客户端初始化](https://supabase.com/docs/reference/javascript/initializing)、[邮箱密码登录](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)、[认证事件](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)。
