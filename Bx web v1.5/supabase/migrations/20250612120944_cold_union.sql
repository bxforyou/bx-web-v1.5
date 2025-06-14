/*
  # Create site content table

  1. New Tables
    - `site_content`
      - `id` (integer, primary key)
      - `content` (jsonb, stores all site content)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `site_content` table
    - Add policy for public read access
    - Add policy for authenticated write access (admin only)
*/

CREATE TABLE IF NOT EXISTS site_content (
  id integer PRIMARY KEY DEFAULT 1,
  content jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Allow public read access (everyone can see the website)
CREATE POLICY "Public read access"
  ON site_content
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to update content (admin panel)
CREATE POLICY "Authenticated users can update content"
  ON site_content
  FOR ALL
  TO authenticated
  USING (true);

-- Insert initial content if table is empty
INSERT INTO site_content (id, content, updated_at)
SELECT 1, '{}'::jsonb, now()
WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE id = 1);