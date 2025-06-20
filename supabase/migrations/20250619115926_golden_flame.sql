/*
  # Disaster Response Platform Database Schema

  1. New Tables
    - `disasters` - Core disaster records with geospatial location data
    - `social_media_reports` - Social media posts related to disasters
    - `resources` - Emergency resources (shelters, food, medical) with geospatial data
    - `image_verifications` - AI-verified disaster images
    - `official_updates` - Government/relief organization updates
    - `cache` - API response caching with TTL

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users and public read access where appropriate

  3. Indexes
    - Geospatial indexes (GiST) for location-based queries
    - GIN indexes for tag arrays and JSONB columns
    - Standard B-tree indexes for foreign keys and frequent queries

  4. Functions
    - `find_nearby_resources` - PostGIS function for radius-based resource search
*/

-- Enable PostGIS extension for geospatial operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Disasters table - Core disaster management
CREATE TABLE IF NOT EXISTS disasters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  location_name text,
  location geography(POINT, 4326), -- PostGIS geography type for lat/lng
  description text NOT NULL,
  tags text[] DEFAULT '{}', -- Array of tags like ['flood', 'earthquake']
  owner_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  audit_trail jsonb DEFAULT '[]'::jsonb -- Audit log as JSONB array
);

-- Social media reports table
CREATE TABLE IF NOT EXISTS social_media_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_id uuid REFERENCES disasters(id) ON DELETE CASCADE,
  social_media_id text UNIQUE NOT NULL, -- External social media post ID
  content text NOT NULL,
  author_id text,
  priority text DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high')),
  source text DEFAULT 'twitter',
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Resources table - Emergency resources with geospatial data
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_id uuid REFERENCES disasters(id) ON DELETE CASCADE,
  name text NOT NULL,
  location_name text,
  location geography(POINT, 4326), -- PostGIS geography for precise location
  type text NOT NULL CHECK (type IN ('shelter', 'food', 'medical', 'water', 'evacuation', 'other')),
  capacity integer,
  contact text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'full')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Image verifications table
CREATE TABLE IF NOT EXISTS image_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_id uuid REFERENCES disasters(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  verification_score integer CHECK (verification_score >= 0 AND verification_score <= 100),
  is_authentic boolean DEFAULT false,
  analysis text,
  context_match text,
  verification_data jsonb, -- Full Gemini API response
  verified_at timestamptz DEFAULT now()
);

-- Official updates table
CREATE TABLE IF NOT EXISTS official_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_id uuid REFERENCES disasters(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  source text NOT NULL,
  urgency text DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  external_url text,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(disaster_id, title, source) -- Prevent duplicate updates
);

-- Cache table for API responses
CREATE TABLE IF NOT EXISTS cache (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create geospatial indexes for fast location-based queries
CREATE INDEX IF NOT EXISTS disasters_location_idx ON disasters USING GIST (location);
CREATE INDEX IF NOT EXISTS resources_location_idx ON resources USING GIST (location);

-- Create GIN indexes for array and JSONB columns
CREATE INDEX IF NOT EXISTS disasters_tags_idx ON disasters USING GIN (tags);
CREATE INDEX IF NOT EXISTS disasters_audit_trail_idx ON disasters USING GIN (audit_trail);
CREATE INDEX IF NOT EXISTS verification_data_idx ON image_verifications USING GIN (verification_data);

-- Create standard indexes for foreign keys and frequent queries
CREATE INDEX IF NOT EXISTS social_media_disaster_id_idx ON social_media_reports (disaster_id);
CREATE INDEX IF NOT EXISTS social_media_priority_idx ON social_media_reports (priority);
CREATE INDEX IF NOT EXISTS resources_disaster_id_idx ON resources (disaster_id);
CREATE INDEX IF NOT EXISTS resources_type_idx ON resources (type);
CREATE INDEX IF NOT EXISTS official_updates_disaster_id_idx ON official_updates (disaster_id);
CREATE INDEX IF NOT EXISTS official_updates_urgency_idx ON official_updates (urgency);
CREATE INDEX IF NOT EXISTS cache_expires_at_idx ON cache (expires_at);

-- Function to find nearby resources using PostGIS
CREATE OR REPLACE FUNCTION find_nearby_resources(
  search_lat FLOAT,
  search_lon FLOAT,
  search_radius INTEGER DEFAULT 10000
)
RETURNS TABLE (
  id uuid,
  disaster_id uuid,
  name text,
  location_name text,
  type text,
  capacity integer,
  contact text,
  status text,
  distance_meters FLOAT,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.disaster_id,
    r.name,
    r.location_name,
    r.type,
    r.capacity,
    r.contact,
    r.status,
    ST_Distance(
      r.location::geometry,
      ST_SetSRID(ST_Point(search_lon, search_lat), 4326)::geometry
    ) AS distance_meters,
    r.created_at
  FROM resources r
  WHERE r.location IS NOT NULL
    AND ST_DWithin(
      r.location::geometry,
      ST_SetSRID(ST_Point(search_lon, search_lat), 4326)::geometry,
      search_radius
    )
    AND r.status = 'active'
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE disasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Disasters: Public read, authenticated users can create/update own records
CREATE POLICY "Public can read disasters"
  ON disasters
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create disasters"
  ON disasters
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own disasters"
  ON disasters
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete own disasters"
  ON disasters
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.jwt() ->> 'sub');

-- Social media reports: Public read, system can insert
CREATE POLICY "Public can read social media reports"
  ON social_media_reports
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can insert social media reports"
  ON social_media_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Resources: Public read, authenticated users can create
CREATE POLICY "Public can read resources"
  ON resources
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create resources"
  ON resources
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update resources"
  ON resources
  FOR UPDATE
  TO authenticated
  USING (true);

-- Image verifications: Public read, authenticated users can create
CREATE POLICY "Public can read image verifications"
  ON image_verifications
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create verifications"
  ON image_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Official updates: Public read, system can insert
CREATE POLICY "Public can read official updates"
  ON official_updates
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can insert official updates"
  ON official_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Cache: System access only
CREATE POLICY "System can manage cache"
  ON cache
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_disasters_updated_at
  BEFORE UPDATE ON disasters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();