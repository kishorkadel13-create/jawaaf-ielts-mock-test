import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function alterTable() {
  const { data, error } = await supabaseAdmin.rpc('exec_sql', {
    query: "ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS cover_image_url TEXT; ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS star_rating INTEGER;"
  });
  console.log("Result:", data, error);
}
alterTable();
