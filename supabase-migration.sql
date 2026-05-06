-- ==========================================================
-- Brew Lab — Supabase migration for the bean redesign
-- ----------------------------------------------------------
-- Paste this entire file into the SQL editor at
--   https://supabase.com/dashboard/project/<your-project>/sql/new
-- and hit Run. Idempotent — safe to re-run.
-- ==========================================================

-- ----- bean_brews -----
CREATE TABLE IF NOT EXISTS public.bean_brews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date timestamptz NOT NULL DEFAULT now(),
  method text,
  ratio text,
  water_temp_f int,
  grind_size text,
  bean_origin text,
  flavor_tags text[] DEFAULT '{}',
  rating int CHECK (rating IS NULL OR (rating BETWEEN 0 AND 5)),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bean_brews_user_date_idx
  ON public.bean_brews (user_id, date DESC);

ALTER TABLE public.bean_brews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bean_brews own select" ON public.bean_brews;
CREATE POLICY "bean_brews own select" ON public.bean_brews
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bean_brews own insert" ON public.bean_brews;
CREATE POLICY "bean_brews own insert" ON public.bean_brews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bean_brews own update" ON public.bean_brews;
CREATE POLICY "bean_brews own update" ON public.bean_brews
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bean_brews own delete" ON public.bean_brews;
CREATE POLICY "bean_brews own delete" ON public.bean_brews
  FOR DELETE USING (auth.uid() = user_id);


-- ----- bean_visits -----
CREATE TABLE IF NOT EXISTS public.bean_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cafe_id text NOT NULL,
  date_iso timestamptz NOT NULL DEFAULT now(),
  rating int CHECK (rating IS NULL OR (rating BETWEEN 0 AND 5)),
  notes text,
  custom_cafe jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bean_visits_user_date_idx
  ON public.bean_visits (user_id, date_iso DESC);

ALTER TABLE public.bean_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bean_visits own select" ON public.bean_visits;
CREATE POLICY "bean_visits own select" ON public.bean_visits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bean_visits own insert" ON public.bean_visits;
CREATE POLICY "bean_visits own insert" ON public.bean_visits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bean_visits own update" ON public.bean_visits;
CREATE POLICY "bean_visits own update" ON public.bean_visits
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bean_visits own delete" ON public.bean_visits;
CREATE POLICY "bean_visits own delete" ON public.bean_visits
  FOR DELETE USING (auth.uid() = user_id);


-- ----- bean_posts -----
CREATE TABLE IF NOT EXISTS public.bean_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text,
  author_handle text,
  author_tier text,
  author_avatar_color text,
  type text NOT NULL DEFAULT 'general',
  title text,
  content text,
  photo_url text,
  tags text[] DEFAULT '{}',
  recipe jsonb,
  shop jsonb,
  kudos_count int NOT NULL DEFAULT 0,
  comments_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bean_posts_created_idx
  ON public.bean_posts (created_at DESC);

ALTER TABLE public.bean_posts ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can read every post (Feed is a community surface).
DROP POLICY IF EXISTS "bean_posts public select" ON public.bean_posts;
CREATE POLICY "bean_posts public select" ON public.bean_posts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "bean_posts own insert" ON public.bean_posts;
CREATE POLICY "bean_posts own insert" ON public.bean_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bean_posts own update" ON public.bean_posts;
CREATE POLICY "bean_posts own update" ON public.bean_posts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bean_posts own delete" ON public.bean_posts;
CREATE POLICY "bean_posts own delete" ON public.bean_posts
  FOR DELETE USING (auth.uid() = user_id);


-- ----- bean_kudos -----
CREATE TABLE IF NOT EXISTS public.bean_kudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.bean_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);
CREATE INDEX IF NOT EXISTS bean_kudos_post_idx
  ON public.bean_kudos (post_id);

ALTER TABLE public.bean_kudos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bean_kudos public select" ON public.bean_kudos;
CREATE POLICY "bean_kudos public select" ON public.bean_kudos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "bean_kudos own insert" ON public.bean_kudos;
CREATE POLICY "bean_kudos own insert" ON public.bean_kudos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bean_kudos own delete" ON public.bean_kudos;
CREATE POLICY "bean_kudos own delete" ON public.bean_kudos
  FOR DELETE USING (auth.uid() = user_id);

-- Keep bean_posts.kudos_count in sync with the bean_kudos rows.
CREATE OR REPLACE FUNCTION public.bean_kudos_count_sync() RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.bean_posts SET kudos_count = kudos_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.bean_posts SET kudos_count = GREATEST(kudos_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bean_kudos_count_trg ON public.bean_kudos;
CREATE TRIGGER bean_kudos_count_trg
  AFTER INSERT OR DELETE ON public.bean_kudos
  FOR EACH ROW EXECUTE FUNCTION public.bean_kudos_count_sync();


-- ----- bean_bookmarks -----
CREATE TABLE IF NOT EXISTS public.bean_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.bean_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.bean_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bean_bookmarks own select" ON public.bean_bookmarks;
CREATE POLICY "bean_bookmarks own select" ON public.bean_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bean_bookmarks own insert" ON public.bean_bookmarks;
CREATE POLICY "bean_bookmarks own insert" ON public.bean_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bean_bookmarks own delete" ON public.bean_bookmarks;
CREATE POLICY "bean_bookmarks own delete" ON public.bean_bookmarks
  FOR DELETE USING (auth.uid() = user_id);


-- ----- bean_lessons -----
CREATE TABLE IF NOT EXISTS public.bean_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('in-progress', 'completed')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.bean_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bean_lessons own select" ON public.bean_lessons;
CREATE POLICY "bean_lessons own select" ON public.bean_lessons
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bean_lessons own insert" ON public.bean_lessons;
CREATE POLICY "bean_lessons own insert" ON public.bean_lessons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bean_lessons own update" ON public.bean_lessons;
CREATE POLICY "bean_lessons own update" ON public.bean_lessons
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bean_lessons own delete" ON public.bean_lessons;
CREATE POLICY "bean_lessons own delete" ON public.bean_lessons
  FOR DELETE USING (auth.uid() = user_id);

-- ==========================================================
-- Done. Verify in the Supabase Table Editor that all six
-- tables show "RLS enabled" (green badge).
-- ==========================================================
