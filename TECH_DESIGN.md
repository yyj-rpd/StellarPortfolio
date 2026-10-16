> **第一阶段实施补充（后续授权更新）**：采用 React/TypeScript/Vite/Tailwind 构建前台，新增 src/data/mockContent.ts、src/types/content.ts 的 PortfolioRepository 及 services 中的只读异步适配器。本阶段显式绑定模拟实现，无自动降级逻辑，不安装 Supabase SDK、不建立数据库或后台。封面暂用本地 SVG，保证本地离线资源可用。未来远端实现负责字段映射、权限和持久化，接口切换后连接失败必须报错。下文的全栈目录、数据库、环境配置及部署均仍是后续方案；“尚未初始化前端”为初始文档阶段记录。

# Stellar Portfolio 技术设计文档

- 文档版本：1.0；编写日期：2026-10-15。
- 关联需求：[PRD.md](PRD.md)；开发约束：[AGENTS.md](AGENTS.md)。
- 当前状态：仅设计，未创建前端、安装依赖、创建数据库、配置云服务、推送或部署。以下目录、SQL、命令与配置均是后续实施方案，不代表已执行。

## 1. 技术栈选型及原因

| 技术 | 用途与理由 |
| --- | --- |
| React + TypeScript + Vite | 组件化界面、类型检查、简单开发和构建流程 |
| Tailwind CSS | 统一响应式样式与设计令牌，减少零散样式维护 |
| React Router | 前台详情路由、后台路由与未找到页面 |
| @supabase/supabase-js | 直接调用 Auth 和受 RLS 保护的 Data API |
| Supabase Auth + PostgreSQL | 托管身份认证、持久化数据库、约束与行级权限 |
| react-markdown | 安全展示 Markdown，默认不启用原始 HTML |
| Vercel | 托管 Vite 静态构建，与 GitHub 集成部署 |
| Git + GitHub | 代码版本、评审、备份与部署触发 |
| ESLint、Vitest、React Testing Library | 静态检查与关键组件/逻辑测试 |
| Playwright | 少量关键流程端到端验证，使用专用测试数据 |

版本在实施时依据官方兼容说明选择受支持版本，并提交锁文件；本设计不固定未经验证的版本号。表单先使用 React 状态和原生校验，不引入 Redux、富文本编辑器、ORM、自建 Node 后端、Realtime 或通用微服务架构。

## 2. 整体系统架构

```text
访客 / 管理员浏览器
       │ HTTPS
       ▼
Vercel：React SPA 与静态资源
       │ 浏览器持公开 key；登录后附用户 JWT
       ├────────► Supabase Auth：邮箱密码登录、刷新、退出
       └────────► Supabase Data API
                         │ 表权限 + RLS + 数据库约束
                         ▼
                   PostgreSQL 内容表
```

Vercel 不保存业务数据，也不需要应用服务器。浏览器直连托管 API 是本方案的明确选择，安全性取决于数据库授权与 RLS，而不是隐藏客户端 key 或路由。Supabase 官方说明公开 key 可用于客户端，secret/service_role key 则具有高权限，不能进入浏览器：[API keys](https://supabase.com/docs/guides/getting-started/api-keys)。

内容从数据库实时查询：页面进入/刷新时查询；后台写入成功后重新查询对应列表。无需重建站点即可发布数据。这里的“最新”指后续查询读到已提交内容，不要求已打开页面自动更新；不使用 Realtime、Service Worker 或业务数据持久缓存。

## 3. 前后端模块划分

### 3.1 前端

- public pages：首页各模块、博客列表和详情，只请求已发布数据。
- admin pages：登录、个人资料、技能、项目、文章管理与 Markdown 预览。
- auth：会话初始化、登录/退出、监听认证变化、管理员身份检查、路由守卫。
- services：统一 Supabase 调用、字段映射、错误转换，不在 UI 中散落查询。
- components：按钮、表单、状态提示、布局及业务卡片。
- types：数据库生成类型、领域类型及发布状态。

使用轻量 AuthContext 共享认证状态；页面数据由局部 state 和自定义 hook 管理。会话加载完成前不渲染后台；非管理员进入明确拒绝界面。异步查询需处理卸载、旧响应覆盖和重复提交。

### 3.2 托管后端

- Auth 负责密码校验与令牌生命周期，不自行存储密码。
- PostgreSQL 负责永久内容、唯一性、枚举、时间戳与发布约束。
- Data API 负责受表授权与 RLS 约束的访问。
- 管理员名单只经 Supabase 控制台/受控迁移修改，不提供网页授权接口。
- 本版封面为 HTTPS 地址，不创建 Storage 桶、不提供上传能力。

## 4. 项目目录结构

以下为后续目标结构，当前不会创建：

```text
StellarPortfolio/
├── PRD.md
├── TECH_DESIGN.md
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
├── vercel.json
├── .env.example
├── .env.local                 # 忽略提交
├── .gitignore
├── public/images/             # 占位图、静态星空资源
├── src/
│   ├── main.tsx
│   ├── app/                   # 路由、提供器
│   ├── pages/
│   │   ├── public/            # Home、BlogList、BlogDetail、NotFound
│   │   └── admin/             # Login、Dashboard、Profile、Skills、Projects、Posts
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── portfolio/
│   ├── features/auth/
│   ├── hooks/
│   ├── services/              # profile、skills、projects、posts
│   ├── lib/                   # supabase、验证、格式化、链接安全
│   ├── types/                 # database.types.ts 等
│   └── styles/                # 全局样式、设计令牌
├── supabase/migrations/       # 表、约束、索引、触发器、grants、RLS
└── tests/
    ├── integration/           # 真实测试库的权限测试
    └── e2e/
```

路由与 PRD 第 5 节完全一致；后台增删改使用列表内表单/对话框，不新增独立编辑路由。

## 5. 数据库表结构

### 5.1 共同约定

业务表位于 public schema，列使用 snake_case。所有内容表包含 created_at、updated_at（timestamptz，NOT NULL，默认 now()）；updated_at 由数据库触发器更新。status 使用 text + CHECK IN ('draft','published')，NOT NULL，默认 draft。

除单例资料表外，业务主键为 uuid，默认 gen_random_uuid()。必填文本禁止空白字符串，字符串长度、数组元素及 URL 按下述规则在数据库约束/触发器和前端共同验证。创建表、启用 RLS、设置 grants 和 policies 必须在同一次迁移事务中完成，不能留下开放窗口。

### 5.2 site_profile（单例个人资料）

| 字段 | 类型/约束 | 说明 |
| --- | --- | --- |
| id | smallint PK，CHECK id = 1 | 全站唯一一条资料 |
| display_name | text NOT NULL，1–80 字符 | 展示名 |
| headline | text NOT NULL，1–120 字符 | 身份简介 |
| research_summary | text NOT NULL，1–200 字符 | 一句话研究兴趣 |
| bio | text NOT NULL，1–4000 字符 | 个人经历简介，按纯文本显示 |
| research_interests | text[] NOT NULL DEFAULT '{}' | 研究兴趣条目 |
| education | jsonb NOT NULL DEFAULT '[]' | 有序教育经历 |
| experiences | jsonb NOT NULL DEFAULT '[]' | 有序科研、实习或开发经历 |
| email | text NOT NULL，最长 254 字符 | 公开邮箱 |
| github_url | text NOT NULL | HTTPS GitHub 主页 |
| status、created_at、updated_at | 见共同字段 | 整条资料统一发布 |

education 每项：school、degree、start、end、description；school/degree/start 必填，end 可为 null 表示至今。experiences 每项：organization、role、start、end、description，前三项必填。日期统一 YYYY-MM，最多各 20 项；description 最长 1000 字，名称最长 160 字。数据库验证 JSON 为数组、元素为对象、必填键与类型及长度有效，前端使用对应 TypeScript 类型。单人站点使用 JSON 数组避免为只整组编辑的资料增加关系表。

首次由管理员通过表单 INSERT id=1，之后 UPDATE；不提供资料删除入口，只提供撤回。没有已发布资料时，首页显示中性空状态，资料关联模块隐藏。

### 5.3 skills（技能）

| 字段 | 类型/约束 | 说明 |
| --- | --- | --- |
| id | uuid PK | 技能标识 |
| name | text NOT NULL，1–80 字符 | 名称 |
| category | text NOT NULL，枚举 language/tool/ml | 编程语言、开发工具、机器学习技术 |
| description | text，最长 300 字符，可空 | 简述 |
| sort_order | integer NOT NULL DEFAULT 0，≥ 0 | 升序排列 |
| status、created_at、updated_at | 共同字段 | 状态与时间 |

### 5.4 projects（项目与科研作品）

| 字段 | 类型/约束 | 说明 |
| --- | --- | --- |
| id | uuid PK | 项目标识 |
| title | text NOT NULL，1–160 字符 | 项目名称 |
| summary | text NOT NULL，1–1000 字符 | 简介 |
| kind | text NOT NULL，枚举 development/research | 开发/科研 |
| tech_stack | text[] NOT NULL DEFAULT '{}' | 技术标签 |
| cover_url | text NOT NULL | HTTPS 封面地址 |
| github_url | text，可空 | HTTPS GitHub 仓库链接 |
| detail_url | text，可空 | HTTPS 外部详情链接 |
| sort_order | integer NOT NULL DEFAULT 0，≥ 0 | 排序 |
| status、created_at、updated_at | 共同字段 | 状态与时间 |

CHECK 至少一个非空 github_url 或 detail_url；空字符串先归一化为 null。tech_stack 和 research_interests 最多 30 项，每项 1–60 字符，不接受空白项。

### 5.5 posts（博客）

| 字段 | 类型/约束 | 说明 |
| --- | --- | --- |
| id | uuid PK | 文章标识 |
| title | text NOT NULL，1–160 字符 | 标题 |
| slug | text NOT NULL UNIQUE，1–100 字符 | 仅小写字母、数字、单连字符分段 |
| excerpt | text NOT NULL，1–300 字符 | 列表摘要 |
| content_markdown | text NOT NULL，1–100000 字符 | Markdown 正文 |
| tags | text[] NOT NULL DEFAULT '{}' | 最多 10 项，每项 1–30 字符 |
| published_at | timestamptz，可空 | 首次发布时间，由数据库控制 |
| status、created_at、updated_at | 共同字段 | 状态与时间 |

slug 正则为 ^[a-z0-9]+(-[a-z0-9]+)*$，不依赖自动中文转拼音；后台允许手填英文标识。数据库 BEFORE INSERT/UPDATE 触发器在首次进入 published 时设 published_at=now()；已存在发布时间则保留旧值，拒绝由客户端任意改写；published 行必须有非空且不晚于当前时间的发布时间。本版不支持定时发布。

技能和项目按 sort_order、created_at、id 排序；文章按 published_at DESC、id DESC 排序，每页 10 条，列表只选摘要字段，详情单独读取正文。建立 skills(status, sort_order)、projects(status, sort_order)、posts(status, published_at DESC, id DESC) 索引；slug 的唯一约束自带索引。

### 5.6 admin_users（管理员名单）

| 字段 | 类型/约束 | 说明 |
| --- | --- | --- |
| user_id | uuid PK，FK auth.users(id) ON DELETE CASCADE | 允许管理网站的账号 |
| created_at | timestamptz NOT NULL DEFAULT now() | 授权时间 |

当前仅插入一个管理员。该表不包含密码，不用可由用户自行修改的 user_metadata 判断权限。新增管理员是将来独立授权操作，不提供前台入口。

## 6. 认证及数据权限设计

### 6.1 登录与管理员初始化

后续先创建 Supabase 项目并关闭公开注册；通过可信 Dashboard 创建邮箱密码账号，妥善设置强密码，然后把其 auth.users.id 加入 admin_users。通过受控 SQL 查询验证绑定正确。不得把管理员密码放入 SQL 迁移、仓库、示例文件或前端。建议启用账号 MFA 作为后续安全增强，非本版依赖。

浏览器使用 signInWithPassword、signOut 和 SDK 会话刷新。初始化调用 getSession 并监听 onAuthStateChange，再查询 admin_users 中自己的行进行界面授权判断；所有实际数据操作仍交由数据库验证 JWT 与 RLS。登录失败使用通用提示，不暴露账号是否存在。密码遗失通过可信控制台恢复，本版不添加公开找回密码流程。

### 6.2 最小权限矩阵

| 数据 | anon（未登录） | authenticated 非管理员 | 管理员 |
| --- | --- | --- | --- |
| 四张内容表 SELECT | 仅 published | 仅 published | 所有状态 |
| site_profile INSERT/UPDATE | 拒绝 | 拒绝 | 允许，限 id=1 |
| site_profile DELETE | 拒绝 | 拒绝 | 拒绝，使用撤回 |
| skills/projects/posts INSERT/UPDATE/DELETE | 拒绝 | 拒绝 | 允许 |
| admin_users SELECT | 拒绝 | 仅自己的行（通常无结果） | 仅自己的行 |
| admin_users INSERT/UPDATE/DELETE | 拒绝 | 拒绝 | 拒绝，名单只由可信控制台维护 |

所有表显式启用 RLS。表授权层只给 anon 业务表 SELECT，给 authenticated 业务表必要的 SELECT/INSERT/UPDATE/DELETE（site_profile 排除 DELETE）；这些只是操作资格，实际可操作行继续由 RLS 收紧。admin_users 仅给 authenticated SELECT，撤销两种 API 角色的全部写权限。

管理员判断采用内联 EXISTS，查询 admin_users 时其自身 SELECT 策略只有 user_id = (select auth.uid())，不回查内容表或递归查询自身；无需 SECURITY DEFINER 函数。

```sql
-- 策略示意，非完整迁移，尚未执行。
-- admin_users 已启用 RLS 且 authenticated 仅获 SELECT：
CREATE POLICY admin_read_self ON public.admin_users
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

-- 下列模式应用到 site_profile / skills / projects / posts：
CREATE POLICY public_read ON public.posts
FOR SELECT TO anon, authenticated
USING (status = 'published');

CREATE POLICY admin_read ON public.posts
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.admin_users a
  WHERE a.user_id = (SELECT auth.uid())
));

CREATE POLICY admin_insert ON public.posts
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.admin_users a
  WHERE a.user_id = (SELECT auth.uid())
));

CREATE POLICY admin_update ON public.posts
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.admin_users a
  WHERE a.user_id = (SELECT auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.admin_users a
  WHERE a.user_id = (SELECT auth.uid())
));

CREATE POLICY admin_delete ON public.posts
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.admin_users a
  WHERE a.user_id = (SELECT auth.uid())
));
```

UPDATE 同时检查旧行与新行，不能只保护前端按钮；每种写入分别建策略，避免用宽泛 FOR ALL 扩大读取范围。site_profile 不建立 DELETE 策略。完整迁移还须包含表、grants、约束、触发器及其他表策略；不可直接把上述示例当作可用数据库。

Supabase 官方解释 RLS 与 Auth 配合及 USING/WITH CHECK 的规则：[Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)。实施时对全部表进行直接 API 权限测试，不能仅检查后台页面能否访问。

### 6.3 内容和会话安全

- Markdown 不启用 rehype-raw，不使用 dangerouslySetInnerHTML；链接协议只允许 https/http/mailto，图片仅允许 HTTPS；后台字段的外部 URL 只允许 HTTPS，GitHub 字段限定 github.com。
- 外链新窗口使用 rel="noopener noreferrer"；不在日志打印密码、JWT、完整会话或敏感配置。
- 认证会话可由 SDK 默认浏览器存储维护，与业务内容存储严格区分；XSS 防护必须覆盖正文、外链及其他输入。
- 管理员编辑已发布数据即更新线上；需要草稿时先撤回。删除为物理删除，明确提示不可由后台恢复；备份恢复依赖另行准备的数据库备份。
- 不以 UI、邮箱字符串、公开 key、可编辑元数据或“已登录”代替管理员授权。

## 7. 关键技术难点

1. **真实持久化与反馈**：写入远端成功后再确认保存；错误保留表单并可重试，禁止静默转存 localStorage。写入返回零行时视为失败或权限变化，不误报成功。
2. **发布可见性**：查询层显式加 published 条件，RLS 再强制过滤；详情不可用本地缓存展示已撤回正文。草稿与不存在的 slug 对访客统一显示未找到。
3. **RLS 正确性**：名单不允许用户写入，策略不递归；覆盖匿名、普通账号和管理员三种身份。
4. **时间及冲突**：数据库存 timestamptz，界面按浏览器时区展示，发布时间注明时区；更新可带旧 updated_at 条件，零行时提示内容已变化并重新加载，防止多标签页覆盖。
5. **输入与渲染**：验证 Markdown、URL、JSON 结构、数组项和 slug 唯一性；数据库报错转换为可读提示。
6. **SPA 与 SEO**：Vercel 回退支持详情直接访问；本版只做基础元信息，若后续需要可靠全文收录再另行评估预渲染/SSR。
7. **视觉性能**：以 CSS 静态星点实现科研氛围；若增加轻量动效，尊重 reduced-motion，不添加重型粒子库。

## 8. 环境变量管理

后续 .env.example 仅包含空值说明：

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

- 本地实际值放 .env.local；将 .env* 加入忽略，并用 !.env.example 允许提交模板。
- VITE_ 前缀变量会进入客户端构建，只能放公开配置；publishable key 是公开项目标识，RLS 才是权限边界。
- 不创建 VITE_SUPABASE_SECRET_KEY、VITE_SERVICE_ROLE_KEY、VITE_DATABASE_URL 等变量。管理员凭据与数据库连接凭据不进入客户端，也不属于本方案 Vercel 构建变量。
- Vercel 分别配置 Development / Preview / Production；Preview 优先接独立测试 Supabase 项目，不允许预览环境任意改生产内容。若无法隔离，先限制预览访问，避免执行写入测试。
- 变量缺失时显示明确配置错误，不模拟后台。修改 Vercel 构建环境变量后重新部署；修改内容数据无需重新部署。

## 9. 本地开发流程（后续执行）

1. 阅读三份文档并确认进入实施阶段，检查 Node.js/npm 版本与 Vite 的官方要求。
2. 在保留文档的前提下初始化 React + TypeScript 项目；不要用脚手架覆盖现有文件。
3. 安装最小运行依赖与验证工具，建立与本文目录一致的结构及 npm scripts。
4. 在 Supabase 创建开发项目，关闭公开注册；编写并审阅迁移，通过可信 SQL Editor 按顺序执行完整迁移，保留版本记录。无需为了本项目强制安装 CLI/Docker。
5. 创建管理员账号并绑定名单；在隔离环境准备一个普通登录账号，用于反向权限测试。
6. 填写 .env.local，按实际 schema 生成或校验 database.types.ts，启动开发服务。
7. 实现认证、资料与内容 CRUD、发布规则，再接入公开页面；未接库阶段只能标注静态界面，不能宣称后台完成。
8. 执行质量检查与真实数据库集成验收，记录环境和结果。

计划提供以下 npm scripts，当前尚不存在：

```powershell
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview
npm run test:e2e
```

首次安装生成锁文件并提交，后续干净检出使用 npm ci。test 约定单次执行，避免 CI 进入 watch；构建执行类型检查与 Vite 打包。禁止在尚无 package.json 时声称以上命令已通过。

## 10. 测试方案

| 层级 | 重点 | 通过条件 |
| --- | --- | --- |
| 静态检查 | TypeScript strict、ESLint、生产构建 | 无错误 |
| 单元/组件 | 输入与 URL 校验、Markdown 安全、错误反馈、发布按钮文案、权限状态 | 关键行为覆盖，不编写机械镜像测试 |
| 真实库集成 | 全表 grants/RLS、管理员名单、唯一性、状态、时间戳 | 三种身份的读写矩阵符合第 6 节 |
| 端到端 | 登录、四类内容保存、刷新保留、草稿/发布/撤回/删除、退出 | 覆盖 PRD AC02–AC08、AC13 |
| 双浏览器验收 | 管理员写入；无痕访客重新查询 | 数据一致，无跨浏览器草稿泄漏 |
| 异常与安全 | 断网、令牌过期、重复 slug、XSS、无配置 | 不伪报成功、不执行脚本、不退回本地后台 |
| 部署与视觉 | 深链接、360/768/1440px、键盘、reduced-motion、Lighthouse | 满足 PRD AC11–AC12 和性能目标 |

权限测试须通过真实 Data API 执行：管理员创建草稿，匿名和普通账号不能读取；匿名与普通账号分别尝试 INSERT/UPDATE/DELETE，验证拒绝且数据未变；普通账号尝试修改 admin_users；管理员发布后匿名可读，撤回后不可读。禁止只用 mock 声称 RLS 已通过。

测试凭据仅从本地/CI 受保护配置读取，不加 VITE_ 前缀、不写入报告；测试只操作带测试标识的数据，清理限制在测试项目内。故障测试与端到端测试不能破坏生产内容。无真实 Supabase 时标记集成验收为未执行，不绕过验收。

## 11. 部署方案

### 11.1 GitHub 推送流程（后续）

1. 检查目录和 git status，若尚未初始化才执行 git init；检查并保护已有历史。
2. 完成 .gitignore 与无值环境模板，检查 git diff 和暂存区，无密钥及真实账号凭据。
3. 在 GitHub 创建目标仓库。先确认仓库归属及公开/私有设置，再配置 remote；不在 URL 中嵌入令牌。
4. 明确暂存文件、提交，再把 main 推到已核对的 origin；日常通过 feat/fix/docs 分支与 Pull Request 合并。

示意命令（存在相应源代码和授权后使用）：

```powershell
git status
git diff --check
git add PRD.md TECH_DESIGN.md AGENTS.md
git commit -m "docs: document Stellar Portfolio requirements and architecture"
git remote add origin https://github.com/<owner>/<repo>.git
git branch -M main
git push -u origin main
```

若 origin 或 main 已存在，先检查而非覆盖配置；代码文件需按实际清单另行暂存。认证使用 GitHub 凭据管理器或 SSH，不提供含密码/令牌的命令。本轮不执行上述命令。

### 11.2 Vercel 流程（后续）

1. 准备生产 Supabase 项目，应用经验证迁移并初始化管理员；检查公开注册关闭、RLS 与 grants 正确。
2. 在 Vercel 导入 GitHub 仓库，选择 Vite，根目录为项目根目录；使用锁文件安装，构建 npm run build，输出 dist。
3. 配置两个公开环境变量，区分预览与生产数据库；以 main 为生产分支，其他分支用于预览。
4. 将以下 SPA 深链接回退配置写入未来的 vercel.json：

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

5. 在 Supabase Auth 配置实际生产 Site URL，按需加入精确的本地/预览重定向白名单，避免宽泛通配；当前密码登录不依赖回调，日后邮件恢复流程必须核对回调设置。
6. 通过预览验证后发布，测试首页、博客详情刷新、后台访问、RLS 和双浏览器一致性；记录可复查的实际结果。
7. GitHub 后续合并触发前端部署；后台日常内容修改直接写数据库。

Vercel 官方给出 Vite SPA 深链接回退方式：[Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)；构建环境变量应按部署环境分别管理：[Environment variables](https://vercel.com/docs/environment-variables)。

### 11.3 回滚与数据保护

- 前端版本回滚使用已验证部署；数据库不会随前端回滚，迁移须兼容旧版本或另做修复迁移。
- 迁移和批量删除前准备可恢复备份，并按所选 Supabase 套餐核对备份能力，不假定自动提供恢复服务。
- 普通删除本版无回收站。恢复数据库需要独立受控流程，不在网页后台提供高权限接口。

## 12. 实施决策与本轮交付检查

本版默认单管理员、中文优先、Markdown 编辑、外链封面、资料 JSON 数组、单行状态而非多版本草稿、刷新读取更新。这些是为降低初学者维护成本作出的设计决定。

文档互检清单：PRD 路由与前端目录对应；四张内容表均有 draft/published；只有可信名单中的管理员能写入；个人资料只能编辑/撤回；博客首次发布时间由数据库保持；P0/P1 均有实现与测试方案；所有外部配置、迁移和部署均明确为待实施。


## 13. 真实内容与学术元信息修订（待未来数据库迁移）

以下覆盖此前示例内容阶段相冲突的必填要求。本轮仅调整领域类型和本地适配器，未执行数据库迁移：

1. Profile.email 为 string | null；未来 site_profile.email 应允许 NULL。education/experiences 的 start、end 在 JSON 中允许 null；未知日期不渲染，也不自动解释为“至今”。
2. Project 增加 categoryLabel、role、result、details（段落字符串数组），未来分别映射 category_label text、role text NULL、result text NULL、details text[]。数据库 details 默认空数组，段落限长且最多 20 项。没有真实链接时 github_url/detail_url 均可 NULL，未来 CHECK 改为“有真实外链或至少一段非空 details”。现有 UI 使用可展开说明，不增加项目路由。
3. Post 增加 contentType（post/publication）及 publication（PublicationMetadata | null），未来 posts 增加 content_type text NOT NULL DEFAULT 'post'（CHECK 枚举）与 publication jsonb NULL。旧普通文章映射为 post/null，继续使用原有 Markdown、标签和分页接口。
4. publication JSON 包含 journal、articleType、authorRole、publicationStatus、publicationDate、doi、url；前三项和发表状态为文字，出版日期、DOI、URL 可为 NULL。未来数据库需校验对象结构、字段长度、日期格式及 HTTPS 外链；content_type=publication 时要求有效元信息，post 时要求 publication 为 NULL。
5. status 继续控制网站公开可见性，publicationStatus 记录期刊发表状态，两者不可混淆。published_at 只记录网站首次发布，publicationDate 才是期刊出版日期。本地适配器按 status 过滤，未知日期保留 null 并稳定排序；不能因为出版日期未知而隐藏已发表论文。
6. 本地 ContentRecord.createdAt/updatedAt 允许 null，避免把早期示例时间当作事实展示。未来数据库仍自动生成非空记录时间，网站发布时仍由触发器设置 published_at；这些都不能回填为期刊出版日期。
7. 论文详情 contentMarkdown 仅保存经过用户信息整理的介绍，不声称是论文全文。普通博客扩展继续使用 contentType=post、publication=null，不需新建一套读取 API。
8. 当前无公开邮箱、无论文外链，也无两个项目的真实仓库链接。界面条件渲染这些字段，禁止用示例地址回退。高权限密钥、认证和 RLS 规则保持不变，后续真实后台新增字段须同步进行约束和权限验收。


## 当前阶段：真实 Supabase 接入与管理后台（用户后续授权，2026-10-16）

本节覆盖此前仅文档/仅前台阶段的限制。用户已说明数据库、初始数据、RLS、Auth 管理员和 admin_users UID 授权已完成；代理未独立验证这些远程状态。本轮授权安装 Supabase JS、接入前后台、实现登录与内容管理，不授权部署或 GitHub 推送。

- 实际表名及字段以 supabase/schema.sql 为准：profile、skills、projects、publications、admin_users；不使用早期 site_profile/posts 表名，不重跑初始化 SQL。
- 生产 contentRepository 只使用 Supabase，公开请求显式筛选 published；无配置或网络失败明确报错，不退回本地数据。
- 后台使用 /admin/login、/admin 和原约定的四个编辑路由。登录后查本人白名单，会话由 SDK 恢复；RLS 仍是权限边界，不提供注册或授权管理入口。
- 编辑表单包含状态、合法枚举、长度、数组与日期校验；论文四分节/普通 Markdown 正文互斥；期刊日期不能用网站日期补写。
- 个人资料支持首次创建、编辑、撤回，不提供删除 UI。技能、项目、论文/札记支持增删改，更新与删除检查原 updated_at 并确认返回行，失败保留输入。
- 前端环境变量仅 VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY。实际值由用户在 .env.local 填写，禁止高权限 key 或密码。只允许 SDK 保存认证会话，不持久化业务数据。
- 本地单元/HTTP 替身测试与真实 Auth/RLS 验收严格区分。配置、启动和待手动远程检查详见 README.md；不得将替身测试通过声称为远程登录或写入通过。

