import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testInsert() {
  const { data, error } = await supabaseAdmin.from('mock_tests').insert([{
    title: 'Test',
    description: 'Test',
    is_demo: false,
    is_published: false,
    duration: 60,
    cover_image_url: 'icon.png'
  }]);
  console.log("Result:", error ? error : "Success");
}
testInsert();
