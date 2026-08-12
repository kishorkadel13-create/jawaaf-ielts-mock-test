const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('http://localhost:54321', process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key');

async function check() {
  const { data, error } = await supabase.from('mock_tests').select('*, sections:mock_test_sections(*, question_groups(*, questions(*)))').order('created_at', { ascending: false }).limit(5);
  if (error) {
    console.error(error);
    return;
  }
  
  data.forEach(test => {
    console.log(`Test: ${test.title}`);
    const reading = test.sections?.find(s => s.type === 'reading');
    if (!reading) return;
    const groups = reading.question_groups || [];
    const allQuestions = groups.flatMap(g => g.questions || []);
    const sectionExplicitTypes = [
      ...(reading.question_types || []),
      ...groups.flatMap(g => g.question_types || []),
      ...allQuestions.map(q => q.question_type).filter(Boolean)
    ];
    console.log(`Explicit Types:`, [...new Set(sectionExplicitTypes)]);
  });
}
check();
