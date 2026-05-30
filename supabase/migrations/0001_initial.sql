-- Enums
CREATE TYPE asset_type AS ENUM ('VIDEO', 'LAB', 'BOTH');
CREATE TYPE material_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETE', 'FAILED');

-- Profiles
CREATE TABLE profiles (
  id text PRIMARY KEY, -- Maps to Clerk user ID
  stripe_customer_id text,
  subscription_status text,
  available_credits int DEFAULT 3 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Educational Materials
CREATE TABLE educational_materials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text REFERENCES profiles(id) NOT NULL,
  source_title text NOT NULL,
  asset_type asset_type NOT NULL,
  target_length int NOT NULL,
  raw_extracted_text text NOT NULL,
  status material_status DEFAULT 'PENDING' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Generated Labs
CREATE TABLE generated_labs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id uuid REFERENCES educational_materials(id) NOT NULL,
  steps_payload jsonb NOT NULL,
  is_published boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Generated Videos
CREATE TABLE generated_videos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id uuid REFERENCES educational_materials(id) NOT NULL,
  mp4_url text,
  blueprint_payload jsonb NOT NULL,
  is_published boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
