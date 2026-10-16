import type { Education, Experience } from './content';

export type Status = 'draft' | 'published';
type Timestamps = { created_at: string; updated_at: string };
export type ProfileRow = Timestamps & {
  id: number; display_name: string; headline: string; research_summary: string; bio: string;
  research_interests: string[]; education: Education[]; experiences: Experience[];
  email: string | null; github_url: string; status: Status;
};
export type SkillRow = Timestamps & {
  id: string; name: string; category: 'language' | 'tool' | 'ml';
  description: string; sort_order: number; status: Status;
};
export type ProjectRow = Timestamps & {
  id: string; title: string; summary: string; kind: 'development' | 'research';
  category_label: string; role: string | null; result: string | null;
  details: string[]; tech_stack: string[]; cover_url: string;
  github_url: string | null; detail_url: string | null; sort_order: number; status: Status;
};
export type PublicationRow = Timestamps & {
  id: string; content_type: 'post' | 'publication'; title: string; slug: string;
  excerpt: string; tags: string[]; status: Status; published_at: string | null;
  journal: string | null; article_type: string | null; author_role: string | null;
  publication_status: string | null; publication_date: string | null; doi: string | null;
  publication_url: string | null; introduction: string | null; research_background: string | null;
  research_content: string | null; personal_contribution: string | null; content_markdown: string | null;
};
export type ProfileInput = Omit<ProfileRow, keyof Timestamps | 'id'> & { id?: number };
export type SkillInput = Omit<SkillRow, keyof Timestamps | 'id'> & { id?: string };
export type ProjectInput = Omit<ProjectRow, keyof Timestamps | 'id'> & { id?: string };
export type PublicationInput = Omit<PublicationRow, keyof Timestamps | 'id' | 'published_at'> & { id?: string };
type Table<Row, Insert> = { Row: Row; Insert: Insert; Update: Partial<Insert>; Relationships: [] };
export type Database = {
  public: {
    Tables: {
      profile: Table<ProfileRow, ProfileInput>;
      skills: Table<SkillRow, SkillInput>;
      projects: Table<ProjectRow, ProjectInput>;
      publications: Table<PublicationRow, PublicationInput>;
      admin_users: Table<{ user_id: string; created_at: string }, { user_id: string }>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
export type AdminTable = 'profile' | 'skills' | 'projects' | 'publications';
export type AdminRow = ProfileRow | SkillRow | ProjectRow | PublicationRow;


