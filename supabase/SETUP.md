# Supabase 数据库初始化与权限验证

编写日期：2026-10-16。配套脚本：[schema.sql](schema.sql)。

## 1. 本轮状态与执行边界

你已说明 Supabase 项目创建完成、数据库正常运行。本轮只生成本地 SQL 和本说明，**没有连接你的项目，没有执行远程建表、写数据或管理员授权**，没有请求数据库密码，没有修改 React 前台或安装前端 Supabase SDK。

schema.sql 是供你后续审阅后在 SQL Editor 中首次人工执行的初始化脚本，不是已执行迁移。执行前确认项目归属、表名与已有数据；若目标库已有相关表，应改写专门的迁移，不能用本脚本覆盖。

本轮只有两个项目交付文件：supabase/schema.sql、supabase/SETUP.md。本地验证工具和虚拟 Auth 用户只存在于系统临时验证环境，不会加入种子数据。

## 2. 表结构与前台兼容关系

本轮按最新需求采用 profile、skills、projects、publications。早期 TECH_DESIGN.md 中 site_profile/posts 的命名由本方案替代；不会同时建立两套内容表或绕过 RLS 的兼容视图。前台现有 PortfolioRepository 接口保持不动，后续只在读取服务层映射。

| 表 | 内容与关键字段 | 当前前台类型/字段 |
| --- | --- | --- |
| profile | display_name、headline、research_summary、bio、research_interests、education、experiences、email、github_url、status | Profile；snake_case 映射 camelCase；id 固定为 1 |
| skills | name、category、description、sort_order、status | Skill；分类 language / tool / ml |
| projects | title、summary、kind、category_label、role、result、details、tech_stack、cover_url、github_url、detail_url、sort_order、status | Project；details 为段落字符串数组 |
| publications | content_type、title、slug、excerpt、tags、期刊元信息、论文分节或札记正文、status、published_at | Post / PublicationMetadata，继续承载 /blog 与详情 |
| admin_users | user_id 外键关联 auth.users.id、created_at | 仅授权检查，不是个人资料或密码表 |

### 2.1 个人资料与空值

- 学校、专业/学位位于 education 数组的 school、degree 中，不在另一组列重复维护。初始值是大连海事大学、计算机科学与技术本科。
- education 和 experiences 使用当前前台的 JSON 对象结构，数据库校验数组、必要键、类型、长度与日期格式。未知 start/end 保持 JSON null，不显示推测日期。
- email 是可空字段，当前为 SQL NULL，公开页面仍显示“暂未公开”，不能自行回填邮箱。
- profile 为单例，最多一行。根据本轮“管理员可新增、编辑、删除”要求，管理员有该表 DELETE 权限；这取代早期资料只能撤回的设计。一般维护建议通过 status 撤回，删除后可重新 INSERT id=1。匿名和普通账号始终不能删除。
- 所有内容表均有 draft / published；默认 draft，初始真实内容显式设为 published。

### 2.2 ID、时间、链接与排序

- skills/projects/publications 的 id 使用 text，保留当前 s1、butterfly-recognition 等稳定字符串；新增时省略 id，由 PostgreSQL 生成 UUID 字符串。profile.id 保持 smallint=1。
- created_at、updated_at 在真正执行 INSERT 时由数据库生成，客户端传入的记录时间会被触发器规范化。它们不表示入学、项目开展或论文发表的日期。
- publications.published_at 是**网站首次发布时间**，第一次 published 时由触发器生成；撤回及再次发布保留原值，客户端不能手工回填。
- publication_date 才是期刊出版日期，目前 NULL；doi、publication_url 也为 NULL。网站记录时间不能作为论文日期显示。
- cover_url 允许 HTTPS 地址，或现有打包资源的 /images/... 路径；路径不会上传图片或创建 Storage 桶。当前两张 SVG 是主题示意图，不是实测图表。
- 未提供项目外链时两列都为 NULL，由非空 details 提供卡片内说明。不要填写官方技术文档来冒充项目仓库。
- 技能/项目排序使用 sort_order ASC、created_at ASC、id ASC；列表索引包含这些字段。论文/札记按 published_at DESC、id DESC 排列，slug 自带唯一索引。

### 2.3 论文与研究札记的双向映射

论文 content_type='publication'，期刊信息使用独立列：

| 数据库字段 | 前台 publication 字段 |
| --- | --- |
| journal | journal |
| article_type | articleType |
| author_role | authorRole |
| publication_status | publicationStatus |
| publication_date | publicationDate（日期字符串或 null） |
| doi | doi |
| publication_url | url |

论文四个分节 introduction、research_background、research_content、personal_contribution 是唯一正文来源。未来适配器生成 Post.contentMarkdown 时按顺序拼接：

~~~typescript
const contentMarkdown = [
  '## 论文简介', row.introduction,
  '## 研究背景', row.research_background,
  '## 主要研究内容', row.research_content,
  '## 个人贡献', row.personal_contribution,
].join('\n\n');
~~~

此时数据库 content_markdown 必须 NULL，避免后台同时编辑整篇和分节导致冲突。正文仍是网站上的论文介绍，不能宣称提供论文全文。

后续普通研究札记设 content_type='post'，使用 content_markdown，论文专用元信息和四分节全部 NULL；适配器输出 publication=null。后台可以通过同一张表和原读取接口继续新增札记，本轮不开发后台。

status 控制网站公开可见性，publication_status 描述期刊发表状态；两者是不同概念。表级 CHECK 防止混合两种正文来源。新建论文需要填写有效标题、摘要、期刊、类型、角色、发表状态和四分节，札记需要标题、摘要与正文；草稿也遵守数据完整性检查。建议后台先在表单中补齐必要字段再保存。

## 3. 初始化前检查

1. 登录 Supabase Dashboard，打开正确的 StellarPortfolio 项目。
2. 如已有业务数据，先准备备份；不要在其他项目中试运行初始化脚本。
3. 查看 Table Editor 或在 SQL Editor 执行下面的只读查询：

~~~sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profile', 'skills', 'projects', 'publications', 'admin_users')
ORDER BY table_name;
~~~

首次执行应没有这五张表。已有同名表时，脚本会在事务最开始报错退出。不要通过删表、关闭 RLS 或 CREATE TABLE IF NOT EXISTS 绕过检查；这可能掩盖已有结构和策略不匹配的问题。

脚本假定标准 Supabase 已提供 auth.users、auth.uid()、anon 与 authenticated；不要在远程项目中手工复制本地测试用的 Auth 替身。

## 4. 在 SQL Editor 执行 schema.sql

以下是你后续手动执行的步骤，本轮代理不会执行：

1. 在 Dashboard 进入 SQL Editor，选择新建查询。
2. 复制 schema.sql 的**全部内容**，从 BEGIN 到 COMMIT，一次性执行；不要只选中种子 INSERT 或部分 grants。
3. 选择具有建表权限的可信数据库角色（通常为 postgres）。SQL Editor 的数据库角色与网站 Auth 管理员不是同一概念。
4. 成功后检查执行结果，再查看五张表。初始化事务同时创建约束、触发器、RLS、grants 与种子，不会先公开一个无策略的内容表。
5. 初始数量应为 profile=1、skills=14、projects=2、publications=1、admin_users=0。不会生成 Auth 账号或自动授权任何用户。
6. 若任何语句失败，事务不能提交。确认失败原因，必要时在同一 SQL 会话先执行 ROLLBACK;，修正后再完整执行。成功初始化后不要再次运行此文件。
7. 后续结构修改使用新的、可追踪的迁移文件；种子是一次性起点，不能反复用它恢复已编辑内容。

检查初始数据：

~~~sql
SELECT 'profile' AS table_name, count(*) FROM public.profile
UNION ALL SELECT 'skills', count(*) FROM public.skills
UNION ALL SELECT 'projects', count(*) FROM public.projects
UNION ALL SELECT 'publications', count(*) FROM public.publications
UNION ALL SELECT 'admin_users', count(*) FROM public.admin_users;

SELECT display_name, email, education FROM public.profile;
SELECT title, role, result FROM public.projects ORDER BY sort_order;
SELECT title, journal, publication_status, publication_date, doi, publication_url

FROM public.publications;
~~~

仅有两项项目与一篇真实综述。没有虚构工作经历、额外文章或 ImageGrab 条目。

## 5. 在 Authentication 创建账号

1. 进入 Authentication → Users。界面名称可能随版本更新，使用管理用户的 Add user / Create new user 功能。
2. 使用你自行选择的登录邮箱与强密码创建管理员候选账号；需要时通过可信控制台完成邮箱确认。不要把密码复制到 SQL、仓库、聊天或前端环境变量中。
3. 复制该账号的 **User UID**。不要复制邮箱、身份提供方 ID 或任意生成的 UUID。
4. 进入 Authentication 的注册设置，关闭公开新用户注册。本网站没有访客注册需求。
5. 为权限反向测试，可以另外创建一个测试账号，但不要加入管理员名单。

Auth 登录邮箱与公开 profile.email 无绑定关系。管理员可使用私有登录邮箱，前台公开邮箱仍保持 NULL。

**创建 Auth 账号或成功登录都不会自动成为管理员。** 当前没有管理员登录页面，本节只是为后续后台认证准备账号。

## 6. 安全授权与撤销管理员

只允许你作为项目所有者在可信 SQL Editor / 受控服务端管理流程中执行。示例里的 YOUR_AUTH_USER_ID 必须替换成第 5 节真实 UID，不要照抄占位值。

先核对身份（SQL Editor 可信角色执行）：

~~~sql
SELECT id, email, created_at
FROM auth.users
WHERE id = 'YOUR_AUTH_USER_ID'::uuid;
~~~

确认唯一结果正是你的账号，然后执行：

~~~sql
INSERT INTO public.admin_users (user_id)
VALUES ('YOUR_AUTH_USER_ID'::uuid)
ON CONFLICT (user_id) DO NOTHING;

SELECT user_id, created_at
FROM public.admin_users
WHERE user_id = 'YOUR_AUTH_USER_ID'::uuid;
~~~

Auth 外键阻止不存在的用户 ID；名单不含密码。本轮默认只授权自己一个账号，但机制允许将来经明确授权增加其他 UID。不能根据“任何已登录用户”、可修改的 user_metadata 或客户端布尔值判断管理员。

撤销时由可信 SQL Editor 执行：

~~~sql
DELETE FROM public.admin_users
WHERE user_id = 'YOUR_AUTH_USER_ID'::uuid;
~~~

下一条受 RLS 保护的语句将重新查询白名单。客户端 JWT 即使仍有效，也不会让已撤销的 UID 保留内容写权限。已开始语句仍遵守 PostgreSQL 的事务快照规则。

### 权限边界

| 身份 | 内容 SELECT | 内容 INSERT/UPDATE/DELETE | admin_users |
| --- | --- | --- | --- |
| anon | 仅 published | 全部拒绝 | 无读取、无写入 |
| authenticated，未授权 | 仅 published | INSERT 拒绝；UPDATE/DELETE 目标不可见、零行 | 只可 SELECT 自己的行，通常为空；无写入 |
| authenticated，白名单管理员 | 全部状态 | 允许，仍受完整性约束 | 只可 SELECT 自己的行；无写入 |
| SQL Editor 可信所有者 | 管理用途，可能绕过 RLS | 管理用途 | 可以维护名单 |

全部五张表启用 RLS，并显式撤销 PUBLIC/anon/authenticated 的默认表权限再按需授予。authenticated 虽有内容表写操作资格，行策略仍要求白名单存在；admin_users 不给任何客户端写权限或写策略。

策略只使用内联 EXISTS。admin_users 本身的 SELECT 条件仅 user_id=auth.uid()，不回查自身或内容表；没有 SECURITY DEFINER 管理员函数或提权 RPC。纯校验函数不访问数据表，且只有必要 EXECUTE 授权。

表 grants 与 RLS 的职责及 Auth 配合方式可参阅 [Supabase RLS 官方文档](https://supabase.com/docs/guides/database/postgres/row-level-security) 与 [PostgreSQL CREATE POLICY](https://www.postgresql.org/docs/16/sql-createpolicy.html)。

## 7. 先检查结构权限，再验证访客

SQL Editor 默认可信角色通常绕过 RLS。直接以 postgres 更新成功，只能证明 SQL 能执行，**不能证明管理员策略正确**。

结构只读检查：

~~~sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profile', 'skills', 'projects', 'publications', 'admin_users')
ORDER BY tablename;

SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profile', 'skills', 'projects', 'publications', 'admin_users')
ORDER BY tablename, policyname;

SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('profile', 'skills', 'projects', 'publications', 'admin_users')
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY table_name, grantee, privilege_type;
~~~

预期五张表 rowsecurity=true；四张内容表有 SELECT/INSERT/UPDATE/DELETE 各自策略，UPDATE 有 USING 与 WITH CHECK；admin_users 仅有 authenticated 的本人行 SELECT 策略。anon 无任何写权限；authenticated 对名单仅 SELECT，没有 TRUNCATE、REFERENCES 或 TRIGGER 等额外权限。

### 7.1 模拟普通访客读取

在可信 SQL Editor 中完整执行以下独立事务。它会临时把技能设为草稿，并切换 anon 验证，最后回滚，不保留测试改动：

~~~sql
BEGIN;
UPDATE public.skills SET status = 'draft' WHERE id = 's1';
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{}', true);
SELECT auth.uid(); -- 应为 NULL
SELECT * FROM public.profile;
SELECT id, name, status FROM public.skills ORDER BY sort_order;
SELECT id, title, status FROM public.projects ORDER BY sort_order;
SELECT title, journal, status FROM public.publications;
SELECT count(*) AS hidden_draft_count FROM public.skills WHERE id = 's1'; -- 0
ROLLBACK;
~~~

正常可读全部已发布数据，s1 草稿不可见。按相同方式把其他内容表的行设为 draft，切换角色再查询，应无法读取对应草稿；单例 profile 变为草稿时查询应为零行。

匿名修改验证使用独立事务，预期捕获 permission denied：

~~~sql
BEGIN;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{}', true);
DO $test$
BEGIN
  BEGIN
    UPDATE public.skills SET description = 'should-not-write' WHERE id = 's1';
    RAISE EXCEPTION 'FAIL: anonymous UPDATE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: anonymous UPDATE denied';
  END;
END;
$test$;
ROLLBACK;
~~~

INSERT/DELETE 同样必须拒绝，且可信角色重新读取时数据不变。表级权限并非只有隐藏按钮。

### 7.2 使用真正的匿名 Data API 请求

在你已初始化 schema 后，可以在本机终端使用自己的项目 URL 与**公开 publishable key**验证 API；不需要密码、secret/service_role key：

~~~powershell
$projectUrl = 'https://YOUR_PROJECT.supabase.co'
$headers = @{ apikey = 'YOUR_PUBLISHABLE_KEY' }
Invoke-RestMethod -Uri "$projectUrl/rest/v1/skills?select=id,name,status&order=sort_order.asc" -Headers $headers
~~~

结果应只包含 published。公开 key 放 apikey 请求头，不把它误当用户 JWT。匿名 POST/PATCH/DELETE 请求应被拒绝且数据库不变。若要测试草稿隐藏，在一个独立测试项目通过可信方式创建或暂时撤回一条内容，再发同样匿名请求，完成后恢复。

本节 API 请求由你后续执行；本轮代理没有调用。GET 返回初始数据不能单独证明所有权限正确，还需下面的普通账号与管理员测试。

## 8. 普通登录账号不能写入或自行提权


将 YOUR_NON_ADMIN_USER_ID 替换为 Authentication 中创建但**未授权**的测试账号 UID。先用可信角色确认该 UID 不在 admin_users。完整事务只做角色模拟，不创建 Auth 会话：

~~~sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'YOUR_NON_ADMIN_USER_ID', true);
SELECT set_config('request.jwt.claims', '{"sub":"YOUR_NON_ADMIN_USER_ID","role":"authenticated"}', true);
SELECT auth.uid();
SELECT * FROM public.admin_users; -- 应为空，不能看到别人的 UID

DO $test$
DECLARE affected integer;
BEGIN
  UPDATE public.skills SET description = 'should-not-write' WHERE id = 's1';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: ordinary UPDATE succeeded'; END IF;
  DELETE FROM public.skills WHERE id = 's1';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: ordinary DELETE succeeded'; END IF;
  BEGIN
    INSERT INTO public.skills(name, category) VALUES ('RLS local probe', 'tool');
    RAISE EXCEPTION 'FAIL: ordinary INSERT succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: ordinary INSERT denied';
  END;
  BEGIN
    INSERT INTO public.admin_users(user_id) VALUES (auth.uid());
    RAISE EXCEPTION 'FAIL: self-authorization succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: whitelist INSERT denied';
  END;
  RAISE NOTICE 'PASS: ordinary UPDATE and DELETE affected zero rows';
END;
$test$;
ROLLBACK;
~~~

对 profile/projects/publications 重复同类验证；所有未授权 INSERT 均被拒绝，UPDATE/DELETE 影响零行。读取已发布行成功不表示有写权限。

白名单 UPDATE/DELETE 对普通用户和网站管理员也必须拒绝，可用同样的异常捕获方式验证。任何客户端账号都不能授予自己或他人管理员权限。

## 9. 验证白名单管理员能正常 CRUD

先完成第 6 节授权，将 YOUR_AUTH_USER_ID 替换为真正的白名单 UID。以下事务新建一条临时技能，依次读取、修改、发布、删除，再回滚；不修改真实展示内容：

~~~sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'YOUR_AUTH_USER_ID', true);
SELECT set_config('request.jwt.claims', '{"sub":"YOUR_AUTH_USER_ID","role":"authenticated"}', true);
SELECT auth.uid();
SELECT * FROM public.admin_users; -- 只能看到自己的授权行

DO $test$
DECLARE probe_id text; affected integer;
BEGIN
  INSERT INTO public.skills(name, category, description, status)
  VALUES ('RLS transactional probe', 'tool', 'temporary verification only', 'draft')
  RETURNING id INTO probe_id;
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE id = probe_id AND status = 'draft') THEN
    RAISE EXCEPTION 'FAIL: administrator cannot read own draft';
  END IF;
  UPDATE public.skills SET description = 'updated', status = 'published' WHERE id = probe_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'FAIL: administrator UPDATE failed'; END IF;
  DELETE FROM public.skills WHERE id = probe_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'FAIL: administrator DELETE failed'; END IF;
  RAISE NOTICE 'PASS: administrator SELECT/INSERT/UPDATE/DELETE';
END;
$test$;
ROLLBACK;
~~~

其他三表同样允许管理员操作，但必须提供满足其 CHECK 的字段。验证 profile 新增时先在同一回滚事务内删除单例，再重新插入；不要尝试同时插入两个 id。未来真实后台还应做二次删除确认。

对 publication 验证：先保存 draft，确认管理员能读而匿名不能读；改 published 后用另一匿名请求读取；再撤回后匿名不应能读。记录首次 published_at，撤回与再次发布后应保持相同，而 publication_date 仍为空。

所有 SET LOCAL ROLE / set_config 只是可信数据库会话中的 RLS 模拟。浏览器不能靠设置任意 UID 获得权限，真实请求的 JWT 由 Supabase Auth 验证。后续登录界面完成后，还必须使用管理员与普通账号各自真正的 access token 进行 Data API 集成验收，不能把这里的模拟当作 Auth 登录验证。

## 10. 常见问题与安全边界

- **初始化报同名表错误**：表示应审查现有结构、编写迁移，不能删表或覆盖种子后继续。
- **new row violates row-level security policy**：核对当前 JWT 的 auth.uid() 与可信白名单，检查 status、写策略和字段约束。不要放开 USING(true)、关闭 RLS 或给所有 authenticated 授权管理员。
- **UPDATE/DELETE 无报错但没变化**：检查返回行数。未授权时常被 RLS 过滤为零行，不能把无报错视为保存成功。
- **约束错误**：查看字段长度、合法分类、slug 唯一性、JSON 必要键和论文/札记的互斥字段。失败后保留表单输入，不回退本地模拟保存。
- **SQL Editor 可以改，网页不能改**：SQL Editor 可能绕过 RLS，应按实际客户端角色和 JWT 验证，不能在网页加入高权限 key。
- **名单明明有 UID 仍无权限**：核对是否复制了正确 Auth UID，是否使用同一 Supabase 项目，是否有有效用户会话。不要按邮箱字符串授权。
- **RLS 递归错误**：本脚本名单只用 user_id=auth.uid()，不应递归。若后续新增策略造成递归，应修复策略依赖，而不是关闭 RLS。
- **本地封面地址是否需 Storage**：不需要。现有 /images/butterfly.svg 与 /images/harbor.svg 在前台 public/images 内；后续上传属于独立功能。
- **安全密钥**：浏览器只使用公开项目 URL 与 publishable key。secret/service_role key 和数据库密码可绕过或超出客户端权限，禁止放入 VITE_、源码、仓库、SQL 种子或日志。
- 不建立未受控的 SECURITY DEFINER、管理 RPC 或绕过 RLS 的视图。本脚本不修改全局默认权限、不禁用 RLS、不自动授权已有 Auth 用户。

## 11. 本轮检查结果与尚待验收

本节只记录实际完成的本地检查。初始化在本地 PostgreSQL WASM（PGlite）中执行，测试环境单独创建最小 auth.users/auth.uid() 和 anon/authenticated，用虚拟 UID 测试数据库行为。它不是你的 Supabase 数据库，也不替代 Supabase Auth 的 JWT 验证或真实 Data API 集成测试。

已完成：完整 SQL 语法和本地执行；初始数量；三种身份的四表读写矩阵；草稿隔离；管理员名单不可客户端修改；字段约束；数据库时间戳与首次网站发布时间；重复初始化中止。验证数据不会提交到项目。

待你后续执行：目标 Supabase SQL Editor 初始化、真实 Auth 账号创建与授权、真实匿名/用户 JWT 的 API 验收。当前网站仍使用原有本地只读数据源，没有自动切换到数据库。

参考：[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)、[PostgreSQL 行级安全](https://www.postgresql.org/docs/17/ddl-rowsecurity.html)、[PGlite API](https://pglite.dev/docs/api)。



## 当前阶段：真实 Supabase 接入与管理后台（用户后续授权，2026-10-16）

本节覆盖此前仅文档/仅前台阶段的限制。用户已说明数据库、初始数据、RLS、Auth 管理员和 admin_users UID 授权已完成；代理未独立验证这些远程状态。本轮授权安装 Supabase JS、接入前后台、实现登录与内容管理，不授权部署或 GitHub 推送。

- 实际表名及字段以 supabase/schema.sql 为准：profile、skills、projects、publications、admin_users；不使用早期 site_profile/posts 表名，不重跑初始化 SQL。
- 生产 contentRepository 只使用 Supabase，公开请求显式筛选 published；无配置或网络失败明确报错，不退回本地数据。
- 后台使用 /admin/login、/admin 和原约定的四个编辑路由。登录后查本人白名单，会话由 SDK 恢复；RLS 仍是权限边界，不提供注册或授权管理入口。
- 编辑表单包含状态、合法枚举、长度、数组与日期校验；论文四分节/普通 Markdown 正文互斥；期刊日期不能用网站日期补写。
- 个人资料支持首次创建、编辑、撤回，不提供删除 UI。技能、项目、论文/札记支持增删改，更新与删除检查原 updated_at 并确认返回行，失败保留输入。
- 前端环境变量仅 VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY。实际值由用户在 .env.local 填写，禁止高权限 key 或密码。只允许 SDK 保存认证会话，不持久化业务数据。
- 本地单元/HTTP 替身测试与真实 Auth/RLS 验收严格区分。配置、启动和待手动远程检查详见 README.md；不得将替身测试通过声称为远程登录或写入通过。

