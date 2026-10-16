export type PublishStatus = 'draft' | 'published';

// 本地内容尚无数据库记录时间；接入 Supabase 后由数据库生成。
export interface ContentRecord {
  id: string;
  status: PublishStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Education {
  school: string;
  degree: string;
  start: string | null;
  end: string | null;
  description: string;
}

export interface Experience {
  organization: string;
  role: string;
  start: string | null;
  end: string | null;
  description: string;
}

export interface Profile {
  id: 1;
  displayName: string;
  headline: string;
  researchSummary: string;
  bio: string;
  researchInterests: string[];
  education: Education[];
  experiences: Experience[];
  email: string | null;
  githubUrl: string;
  status: PublishStatus;
}

export type SkillCategory = 'language' | 'tool' | 'ml';

export interface Skill extends ContentRecord {
  name: string;
  category: SkillCategory;
  description: string;
  sortOrder: number;
}

export interface Project extends ContentRecord {
  title: string;
  summary: string;
  kind: 'development' | 'research';
  categoryLabel: string;
  role: string | null;
  result: string | null;
  details: string[];
  techStack: string[];
  coverUrl: string;
  githubUrl: string | null;
  detailUrl: string | null;
  sortOrder: number;
}

export interface PublicationMetadata {
  journal: string;
  articleType: string;
  authorRole: string;
  publicationStatus: string;
  // 期刊出版日期与网站 publishedAt 是两个独立字段，均不能推断。
  publicationDate: string | null;
  doi: string | null;
  url: string | null;
}

export interface Post extends ContentRecord {
  contentType: 'post' | 'publication';
  publication: PublicationMetadata | null;
  title: string;
  slug: string;
  excerpt: string;
  contentMarkdown: string;
  tags: string[];
  publishedAt: string | null;
}

export type PostSummary = Omit<Post, 'contentMarkdown'>;
export interface PostPage { items: PostSummary[]; total: number; page: number; pageSize: number }
export interface PortfolioRepository {
  getProfile(): Promise<Profile | null>;
  listSkills(): Promise<Skill[]>;
  listProjects(): Promise<Project[]>;
  listPosts(page?: number, pageSize?: number): Promise<PostPage>;
  getPost(slug: string): Promise<Post | null>;
}
export interface HomeContent { profile: Profile | null; skills: Skill[]; projects: Project[]; posts: PostSummary[] }

