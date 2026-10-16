-- Stellar Portfolio / initial schema / 2026-10-16
-- 仅供在目标 Supabase 项目 SQL Editor 中人工首次执行；本文件尚未执行远程操作。
-- 此版本按本轮需求使用 profile/publications，替代早期文档中的 site_profile/posts。
-- 单事务、首次初始化脚本：遇到同名表即退出，不覆盖已有表或已编辑内容。
-- 管理员白名单初始为空，绝不自动授权任意 Auth 用户。
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $preflight$
BEGIN
  IF to_regclass('public.profile') IS NOT NULL
     OR to_regclass('public.skills') IS NOT NULL
     OR to_regclass('public.projects') IS NOT NULL
     OR to_regclass('public.publications') IS NOT NULL
     OR to_regclass('public.admin_users') IS NOT NULL THEN
    RAISE EXCEPTION '初始化已中止：发现同名表。请审查已有结构并编写后续迁移，不要反复运行初始 schema。';
  END IF;
END;
$preflight$;

-- 纯校验函数：无表查询、无提权、固定 search_path。
CREATE FUNCTION public.portfolio_valid_items(items text[], max_items integer, max_length integer)
RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER
SET search_path = ''
AS $fn$
  SELECT cardinality(items) <= max_items
    AND coalesce(array_ndims(items), 1) = 1
    AND NOT EXISTS (
      SELECT 1 FROM unnest(items) AS entry(value)
      WHERE value IS NULL OR char_length(btrim(value)) = 0 OR char_length(value) > max_length
    );
$fn$;

CREATE FUNCTION public.portfolio_valid_history(entries jsonb, kind text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE STRICT SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
  item jsonb;
  name_key text;
  role_key text;
  date_key text;
BEGIN
  IF kind NOT IN ('education', 'experience') THEN RETURN false; END IF;
  IF jsonb_typeof(entries) <> 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(entries) > 20 THEN RETURN false; END IF;
  name_key := CASE WHEN kind = 'education' THEN 'school' ELSE 'organization' END;
  role_key := CASE WHEN kind = 'education' THEN 'degree' ELSE 'role' END;
  FOR item IN SELECT value FROM jsonb_array_elements(entries) LOOP
    IF jsonb_typeof(item) <> 'object'
       OR NOT (item ?& ARRAY[name_key, role_key, 'start', 'end', 'description']) THEN
      RETURN false;
    END IF;
    IF coalesce(jsonb_typeof(item -> name_key), '') <> 'string'
       OR coalesce(jsonb_typeof(item -> role_key), '') <> 'string'
       OR coalesce(jsonb_typeof(item -> 'description'), '') <> 'string' THEN
      RETURN false;
    END IF;
    IF char_length(btrim(item ->> name_key)) NOT BETWEEN 1 AND 160
       OR char_length(btrim(item ->> role_key)) NOT BETWEEN 1 AND 160
       OR char_length(item ->> 'description') > 1000 THEN
      RETURN false;
    END IF;
    FOREACH date_key IN ARRAY ARRAY['start', 'end'] LOOP
      IF jsonb_typeof(item -> date_key) <> 'null' THEN
        IF jsonb_typeof(item -> date_key) <> 'string'
           OR (item ->> date_key) !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
          RETURN false;
        END IF;
      END IF;
    END LOOP;
    IF item ->> 'start' IS NOT NULL AND item ->> 'end' IS NOT NULL
       AND (item ->> 'start') > (item ->> 'end') THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END;
$fn$;

CREATE FUNCTION public.portfolio_valid_https(value text)
RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER
SET search_path = ''
AS $fn$
  SELECT char_length(value) <= 2048
    AND value ~ '^https://[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?([:][0-9]{1,5})?([/?#][^[:space:]]*)?$';
$fn$;

CREATE TABLE public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profile (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 80),
  headline text NOT NULL CHECK (char_length(btrim(headline)) BETWEEN 1 AND 120),
  research_summary text NOT NULL CHECK (char_length(btrim(research_summary)) BETWEEN 1 AND 200),
  bio text NOT NULL CHECK (char_length(btrim(bio)) BETWEEN 1 AND 4000),
  research_interests text[] NOT NULL DEFAULT '{}' CHECK (public.portfolio_valid_items(research_interests, 30, 60)),
  -- 学校和专业存于 education[*].school / degree，直接兼容当前前台数组结构。
  education jsonb NOT NULL DEFAULT '[]' CHECK (public.portfolio_valid_history(education, 'education')),
  experiences jsonb NOT NULL DEFAULT '[]' CHECK (public.portfolio_valid_history(experiences, 'experience')),
  email text CHECK (email IS NULL OR (char_length(email) <= 254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')),
  github_url text NOT NULL CHECK (char_length(github_url) <= 2048 AND github_url ~ '^https://github[.]com(/[^[:space:]]*)?$'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- text 主键保留现有 s1 等稳定 ID；后台新记录可使用默认生成的 UUID 字符串。
CREATE TABLE public.skills (
  id text PRIMARY KEY DEFAULT (gen_random_uuid()::text) CHECK (char_length(id) BETWEEN 1 AND 100 AND id ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  category text NOT NULL CHECK (category IN ('language', 'tool', 'ml')),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 300),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (

  id text PRIMARY KEY DEFAULT (gen_random_uuid()::text) CHECK (char_length(id) BETWEEN 1 AND 100 AND id ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  summary text NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 1 AND 1000),
  kind text NOT NULL DEFAULT 'development' CHECK (kind IN ('development', 'research')),
  category_label text NOT NULL CHECK (char_length(btrim(category_label)) BETWEEN 1 AND 120),
  role text CHECK (role IS NULL OR char_length(btrim(role)) BETWEEN 1 AND 160),
  result text CHECK (result IS NULL OR char_length(btrim(result)) BETWEEN 1 AND 300),
  details text[] NOT NULL DEFAULT '{}' CHECK (public.portfolio_valid_items(details, 20, 1000)),
  tech_stack text[] NOT NULL DEFAULT '{}' CHECK (public.portfolio_valid_items(tech_stack, 30, 60)),
  cover_url text NOT NULL CHECK (
    public.portfolio_valid_https(cover_url) OR (
      cover_url ~ '^/images/[A-Za-z0-9][A-Za-z0-9._/-]*$'
      AND position('..' IN cover_url) = 0 AND position('//' IN cover_url) = 0
      AND char_length(cover_url) <= 2048
    )
  ),
  github_url text CHECK (github_url IS NULL OR (char_length(github_url) <= 2048 AND github_url ~ '^https://github[.]com(/[^[:space:]]*)?$')),
  detail_url text CHECK (detail_url IS NULL OR public.portfolio_valid_https(detail_url)),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cardinality(details) > 0 OR github_url IS NOT NULL OR detail_url IS NOT NULL)
);

-- 同一表保存学术论文与后续札记；不要重复保存论文结构化分节和整篇介绍。
CREATE TABLE public.publications (
  id text PRIMARY KEY DEFAULT (gen_random_uuid()::text) CHECK (char_length(id) BETWEEN 1 AND 100 AND id ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  content_type text NOT NULL DEFAULT 'publication' CHECK (content_type IN ('publication', 'post')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 300),
  slug text NOT NULL UNIQUE CHECK (char_length(slug) BETWEEN 1 AND 100 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt text NOT NULL CHECK (char_length(btrim(excerpt)) BETWEEN 1 AND 1000),
  tags text[] NOT NULL DEFAULT '{}' CHECK (public.portfolio_valid_items(tags, 10, 60)),
  journal text CHECK (journal IS NULL OR char_length(btrim(journal)) BETWEEN 1 AND 160),
  article_type text CHECK (article_type IS NULL OR char_length(btrim(article_type)) BETWEEN 1 AND 120),
  author_role text CHECK (author_role IS NULL OR char_length(btrim(author_role)) BETWEEN 1 AND 160),
  publication_status text CHECK (publication_status IS NULL OR char_length(btrim(publication_status)) BETWEEN 1 AND 80),
  publication_date date,
  doi text CHECK (doi IS NULL OR (char_length(doi) <= 255 AND doi ~ '^10[.][0-9]{4,9}/[^[:space:]]+$')),
  publication_url text CHECK (publication_url IS NULL OR public.portfolio_valid_https(publication_url)),
  introduction text CHECK (introduction IS NULL OR char_length(btrim(introduction)) BETWEEN 1 AND 10000),
  research_background text CHECK (research_background IS NULL OR char_length(btrim(research_background)) BETWEEN 1 AND 10000),
  research_content text CHECK (research_content IS NULL OR char_length(btrim(research_content)) BETWEEN 1 AND 30000),
  personal_contribution text CHECK (personal_contribution IS NULL OR char_length(btrim(personal_contribution)) BETWEEN 1 AND 10000),
  content_markdown text CHECK (content_markdown IS NULL OR char_length(btrim(content_markdown)) BETWEEN 1 AND 100000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  -- 仅为网站首次发布时间，绝不是期刊出版日期。
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (content_type = 'publication' AND journal IS NOT NULL AND article_type IS NOT NULL
      AND author_role IS NOT NULL AND publication_status IS NOT NULL
      AND introduction IS NOT NULL AND research_background IS NOT NULL
      AND research_content IS NOT NULL AND personal_contribution IS NOT NULL
      AND content_markdown IS NULL)
    OR
    (content_type = 'post' AND content_markdown IS NOT NULL
      AND journal IS NULL AND article_type IS NULL AND author_role IS NULL
      AND publication_status IS NULL AND publication_date IS NULL AND doi IS NULL
      AND publication_url IS NULL AND introduction IS NULL AND research_background IS NULL
      AND research_content IS NULL AND personal_contribution IS NULL)
  ),
  CHECK (status <> 'published' OR published_at IS NOT NULL)
);

CREATE INDEX skills_display_idx ON public.skills (status, sort_order, created_at, id);
CREATE INDEX projects_display_idx ON public.projects (status, sort_order, created_at, id);
CREATE INDEX publications_display_idx ON public.publications (status, published_at DESC, id DESC);

-- 记录时间统一由数据库维护，客户端不能回填创建时间。
CREATE FUNCTION public.portfolio_record_timestamps()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := clock_timestamp();
  ELSE
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$fn$;

CREATE FUNCTION public.portfolio_publication_timestamp()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN

    NEW.published_at := CASE WHEN NEW.status = 'published' THEN clock_timestamp() ELSE NULL END;
  ELSE
    NEW.published_at := OLD.published_at;
    IF NEW.status = 'published' AND OLD.published_at IS NULL THEN
      NEW.published_at := clock_timestamp();
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER record_timestamps BEFORE INSERT OR UPDATE ON public.profile
FOR EACH ROW EXECUTE FUNCTION public.portfolio_record_timestamps();
CREATE TRIGGER record_timestamps BEFORE INSERT OR UPDATE ON public.skills
FOR EACH ROW EXECUTE FUNCTION public.portfolio_record_timestamps();
CREATE TRIGGER record_timestamps BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.portfolio_record_timestamps();
CREATE TRIGGER record_timestamps BEFORE INSERT OR UPDATE ON public.publications
FOR EACH ROW EXECUTE FUNCTION public.portfolio_record_timestamps();
CREATE TRIGGER publication_timestamp BEFORE INSERT OR UPDATE ON public.publications
FOR EACH ROW EXECUTE FUNCTION public.portfolio_publication_timestamp();

-- 取消默认宽松权限；只触及本脚本创建的表/函数，不改变其他对象或全局默认权限。
REVOKE ALL ON public.profile, public.skills, public.projects, public.publications, public.admin_users
FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.profile, public.skills, public.projects, public.publications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile, public.skills, public.projects, public.publications TO authenticated;
GRANT SELECT ON public.admin_users TO authenticated;

REVOKE ALL ON FUNCTION public.portfolio_valid_items(text[], integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portfolio_valid_history(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portfolio_valid_https(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portfolio_record_timestamps() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portfolio_publication_timestamp() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portfolio_valid_items(text[], integer, integer),
  public.portfolio_valid_history(jsonb, text), public.portfolio_valid_https(text) TO authenticated;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

-- 管理员表不引用自己、不查询业务表，不存在递归；名单没有任何客户端写策略。
CREATE POLICY admin_read_self ON public.admin_users FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

-- profile: 访客只看 published，管理员可看草稿并执行 CRUD。
CREATE POLICY public_read ON public.profile FOR SELECT TO anon, authenticated
USING (status = 'published');
CREATE POLICY admin_read ON public.profile FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY admin_insert ON public.profile FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY admin_update ON public.profile FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY admin_delete ON public.profile FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));

-- skills: 访客只看 published，管理员可看草稿并执行 CRUD。
CREATE POLICY public_read ON public.skills FOR SELECT TO anon, authenticated
USING (status = 'published');
CREATE POLICY admin_read ON public.skills FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY admin_insert ON public.skills FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY admin_update ON public.skills FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY admin_delete ON public.skills FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));

-- projects: 访客只看 published，管理员可看草稿并执行 CRUD。
CREATE POLICY public_read ON public.projects FOR SELECT TO anon, authenticated
USING (status = 'published');
CREATE POLICY admin_read ON public.projects FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY admin_insert ON public.projects FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY admin_update ON public.projects FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY admin_delete ON public.projects FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));

-- publications: 访客只看 published，管理员可看草稿并执行 CRUD。

CREATE POLICY public_read ON public.publications FOR SELECT TO anon, authenticated
USING (status = 'published');
CREATE POLICY admin_read ON public.publications FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY admin_insert ON public.publications FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY admin_update ON public.publications FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY admin_delete ON public.publications FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users AS a WHERE a.user_id = (SELECT auth.uid())));

-- 初始公开数据：严格来自当前前台，不创建 Auth 用户，也不填造管理员 UID。
-- 执行时生成的 created_at/updated_at/published_at 只是网站记录时间。
INSERT INTO public.profile (
  id, display_name, headline, research_summary, bio, research_interests,
  education, experiences, email, github_url, status
) VALUES (
  1, 'Yan Jia', '大连海事大学 · 计算机科学与技术本科',
  '关注机器学习与 AI for Science，喜欢把算法、科研思考和工程实践结合起来。', '你好，我是一名计算机科学与技术专业的学生，关注机器学习与 AI for Science。喜欢将算法、科研思考和工程实践结合起来，探索人工智能解决真实问题的可能性。',
  ARRAY['Machine Learning', 'AI for Science', 'Deep Learning', 'Machine Learning Applications']::text[], '[{"school":"大连海事大学","degree":"计算机科学与技术 · 本科","start":null,"end":null,"description":""}]'::jsonb, '[]'::jsonb,
  NULL, 'https://github.com/yyj-rpd', 'published'
);

INSERT INTO public.skills (id, name, category, description, sort_order, status) VALUES
  ('s1', 'Python', 'language', '数据分析与机器学习建模', 0, 'published'),
  ('s2', 'C++', 'language', '', 1, 'published'),
  ('s3', 'JavaScript', 'language', '', 2, 'published'),
  ('s4', 'TypeScript', 'language', '', 3, 'published'),
  ('s5', 'TensorFlow', 'ml', '深度学习模型训练', 4, 'published'),
  ('s6', 'MobileNetV2', 'ml', '轻量化图像分类', 5, 'published'),
  ('s7', 'LightGBM', 'ml', '港口等待预测建模', 6, 'published'),
  ('s8', 'KMeans', 'ml', '船型聚类', 7, 'published'),
  ('s9', '特征工程', 'ml', '真实场景数据建模', 8, 'published'),
  ('s10', 'Git', 'tool', '版本管理', 9, 'published'),
  ('s11', 'GitHub', 'tool', '代码托管', 10, 'published'),
  ('s12', 'React', 'tool', 'Web 界面开发', 11, 'published'),
  ('s13', 'HTML / CSS', 'tool', '页面结构与样式', 12, 'published'),
  ('s14', 'MySQL', 'tool', '关系数据存储', 13, 'published');

INSERT INTO public.projects (
  id, title, summary, kind, category_label, role, result, details, tech_stack,
  cover_url, github_url, detail_url, sort_order, status
) VALUES
  ('butterfly-recognition', '观蝶小筑', '基于 MobileNetV2 的蝴蝶图像识别系统，结合微信小程序提供识别、科普与交互功能。', 'development', '计算机视觉与应用开发', '项目负责人', '实际测试分类准确率约 91%',
    ARRAY['使用 Python 与 TensorFlow 训练 MobileNetV2 轻量化图像分类模型，并结合 MySQL 与微信小程序完成系统开发。', '作为项目负责人，参与模型训练、参数调优以及系统开发，将图像分类能力连接到小程序中的识别、科普和交互流程。', '系统在实际测试中获得约 91% 的分类准确率；该结果描述项目测试表现，不推断为其他数据集或使用场景的指标。']::text[],
    ARRAY['Python', 'TensorFlow', 'MobileNetV2', 'MySQL', '微信小程序']::text[], '/images/butterfly.svg', NULL, NULL, 0, 'published'),
  ('port-vessel-waiting', '港口船舶等泊时长预测', '基于真实港口作业数据构建两阶段预测方案，结合船型聚类、天气与港口拥堵特征，面向实际作业场景分析船舶等待情况。', 'development', '机器学习与工业场景应用', NULL, NULL,
    ARRAY['围绕真实港口作业数据开展数据处理与分析，将作业信息组织为面向船舶等待预测的模型输入。', '采用两阶段方案：第一阶段判断船舶是否直靠，第二阶段针对非直靠船舶进行等待时长分类。', '结合 KMeans 船型聚类、天气与港口拥堵特征开展特征工程，并使用 LightGBM 进行机器学习建模与模型选择。', '关注模型输入与实际港口作业场景的联系，为理解船舶等待情况和辅助作业分析提供参考。']::text[],
    ARRAY['Python', 'LightGBM', 'KMeans', '特征工程']::text[], '/images/harbor.svg', NULL, NULL, 1, 'published');

INSERT INTO public.publications (
  id, content_type, title, slug, excerpt, tags,
  journal, article_type, author_role, publication_status,
  publication_date, doi, publication_url,
  introduction, research_background, research_content, personal_contribution, status
) VALUES (
  'ai-md-water-treatment', 'publication', 'Artificial Intelligence-Enhanced Molecular Dynamics Simulations in Water Treatment', 'ai-enhanced-molecular-dynamics-water-treatment',
  '该综述讨论人工智能增强分子动力学模拟在水处理中的研究进展，涉及机器学习力场、分子性质预测、多尺度建模、工作流自动化，以及相关方法在材料设计、机理分析和性能预测中的应用。', ARRAY['AI for Science', 'Molecular Dynamics', 'Water Treatment']::text[],
  'Environmental Research', 'Review Article（综述论文）',
  '独立第一作者', '已发表',
  NULL, NULL, NULL,
  '本综述系统梳理人工智能增强分子动力学模拟在水处理领域的研究进展，关注机器学习方法如何与分子模拟相结合，以及这些方法在水处理研究中的应用。',
  '水处理材料设计和作用机理研究涉及对分子性质、相互作用及材料性能的理解。本文围绕人工智能与分子动力学模拟的结合展开综述，整理相关研究路径、应用方向与方法进展。',
  '- **机器学习力场**：梳理机器学习力场与分子动力学模拟结合的研究进展。
- **分子性质预测**：讨论机器学习辅助分子性质预测的方法及相关应用。
- **多尺度建模**：总结面向水处理问题的多尺度建模研究。
- **工作流自动化**：梳理人工智能支持模拟工作流自动化的研究方向。
- **水处理应用**：归纳相关方法在材料设计、作用机理分析、方法优化与性能预测中的应用。',
  '作为独立第一作者，系统梳理相关研究进展，归纳人工智能增强分子动力学模拟的主要方法，并总结其在水处理研究中的应用方向。', 'published'
);

-- 白名单有意保持为空，授权步骤见 SETUP.md，不能把示例 UUID 当管理员种子。
NOTIFY pgrst, 'reload schema';
COMMIT;


