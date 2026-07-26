import { supabaseAdmin } from '../config/supabase.js';

// Get all mock tests (with locks applied for non-premium students)
export const getTests = async (req, res) => {
  try {
    const isStudent = req.user.role === 'student';
    const hasFullAccess = req.user.has_full_access;

    let query = supabaseAdmin.from('mock_tests').select('*').order('created_at', { ascending: false });

    // Students only see published tests
    if (isStudent) {
      query = query.eq('is_published', true);
    }

    const { data: tests, error } = await query;

    if (error) throw error;

    const testIds = tests.map(test => test.id);
    let sections = [];
    let groups = [];
    let questions = [];

    if (testIds.length > 0) {
      const { data: sectionList, error: sectionError } = await supabaseAdmin
        .from('test_sections')
        .select('id, mock_test_id, type, title, duration, order_no')
        .in('mock_test_id', testIds)
        .order('order_no', { ascending: true });

      if (sectionError) throw sectionError;
      sections = sectionList || [];

      const sectionIds = sections.map(section => section.id);
      if (sectionIds.length > 0) {
        const { data: groupList, error: groupError } = await supabaseAdmin
          .from('question_groups')
          .select('id, section_id, title, instruction, order_no')
          .in('section_id', sectionIds);

        if (groupError) throw groupError;
        groups = groupList || [];

        const groupIds = groups.map(group => group.id);
        if (groupIds.length > 0) {
          const { data: questionList, error: questionError } = await supabaseAdmin
            .from('questions')
            .select('id, group_id, question_type, extra_data_json')
            .in('group_id', groupIds);

          if (questionError) throw questionError;
          questions = questionList || [];
        }
      }
    }

    const groupsBySectionId = groups.reduce((acc, group) => {
      acc[group.section_id] = acc[group.section_id] || [];
      acc[group.section_id].push(group);
      return acc;
    }, {});

    const questionsByGroupId = questions.reduce((acc, question) => {
      acc[question.group_id] = acc[question.group_id] || [];
      acc[question.group_id].push(question);
      return acc;
    }, {});

    // Map lock logic for student view
    const formattedTests = tests.map(test => {
      const isLocked = isStudent && !test.is_demo && !hasFullAccess;
      const testSections = sections
        .filter(section => section.mock_test_id === test.id)
        .map(section => {
          const sectionGroups = groupsBySectionId[section.id] || [];
          const questionGroups = sectionGroups.map(group => {
            const groupQuestions = questionsByGroupId[group.id] || [];
            const questionTypes = [...new Set(groupQuestions
              .map(question => question.extra_data_json?.original_type || question.question_type)
              .filter(Boolean))];

            return {
              ...group,
              question_count: groupQuestions.length,
              question_types: questionTypes,
              primary_question_type: questionTypes[0] || ''
            };
          });
          const question_count = questionGroups.reduce((total, group) => total + (group.question_count || 0), 0);
          const questionTypes = [...new Set(questionGroups.flatMap(group => group.question_types || []))];

          return {
            ...section,
            group_count: sectionGroups.length,
            question_count,
            question_groups: questionGroups,
            question_types: questionTypes,
            audio_file: section.type === 'listening' ? test.audio_file : null
          };
        });

      return {
        ...test,
        sections: testSections,
        is_locked: isLocked
      };
    });

    res.status(200).json(formattedTests);
  } catch (err) {
    console.error('getTests Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to retrieve tests.' });
  }
};

// Retrieve fully nested mock test details for CBT exam interface
export const getTestById = async (req, res) => {
  try {
    const { id } = req.params;
    const isStudent = req.user.role === 'student';
    const hasFullAccess = req.user.has_full_access;

    // 1. Fetch mock test header
    const { data: test, error: testError } = await supabaseAdmin
      .from('mock_tests')
      .select('*')
      .eq('id', id)
      .single();

    if (testError || !test) {
      return res.status(404).json({ error: 'NotFoundError', message: 'Mock test not found.' });
    }

    // 2. Validate Student Access Limits
    if (isStudent) {
      if (!test.is_published) {
        return res.status(403).json({ error: 'Forbidden', message: 'This test is not published yet.' });
      }
      if (!test.is_demo && !hasFullAccess) {
        return res.status(403).json({ error: 'PremiumLocked', message: 'Premium test locked. Access request required.' });
      }
    }

    // 3. Fetch nested sections
    const { data: sections, error: secError } = await supabaseAdmin
      .from('test_sections')
      .select('*')
      .eq('mock_test_id', id)
      .order('order_no', { ascending: true });

    if (secError) throw secError;

    // 4. Fetch nested question groups & questions
    const sectionIds = sections.map(s => s.id);
    let questionGroups = [];
    let questions = [];

    if (sectionIds.length > 0) {
      const { data: groups, error: grpError } = await supabaseAdmin
        .from('question_groups')
        .select('*')
        .in('section_id', sectionIds)
        .order('order_no', { ascending: true });

      if (grpError) throw grpError;
      questionGroups = groups;

      const groupIds = questionGroups.map(g => g.id);
      if (groupIds.length > 0) {
        const { data: qList, error: qError } = await supabaseAdmin
          .from('questions')
          .select('*')
          .in('group_id', groupIds)
          .order('question_number', { ascending: true });

        if (qError) throw qError;
        questions = qList;
      }
    }

    // 5. Structure the nested response
    const nestedSections = sections.map(sec => {
      const secGroups = questionGroups
        .filter(g => g.section_id === sec.id)
        .map(grp => {
          const grpQuestions = questions.filter(q => q.group_id === grp.id);
          return { ...grp, questions: grpQuestions };
        });
      return { ...sec, question_groups: secGroups };
    });

    res.status(200).json({
      ...test,
      sections: nestedSections
    });
  } catch (err) {
    console.error('getTestById Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to retrieve test details.' });
  }
};

// Create mock test (Admin Only)
export const createTest = async (req, res) => {
  try {
    const { title, description, is_demo, is_published, duration, section_template = 'full_mock' } = req.body;

    const { data: test, error } = await supabaseAdmin
      .from('mock_tests')
      .insert([{
        title,
        description,
        is_demo,
        is_published,
        duration,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (error) throw error;

    const practiceTemplates = {
      reading: [{ mock_test_id: test.id, type: 'reading', title: 'Reading Practice', duration: 60, order_no: 1 }],
      reading_passage_1: [{ mock_test_id: test.id, type: 'reading', title: 'Reading Passage 1 Practice', duration: 20, order_no: 1 }],
      reading_passage_2: [{ mock_test_id: test.id, type: 'reading', title: 'Reading Passage 2 Practice', duration: 20, order_no: 1 }],
      reading_passage_3: [{ mock_test_id: test.id, type: 'reading', title: 'Reading Passage 3 Practice', duration: 20, order_no: 1 }],
      listening: [{ mock_test_id: test.id, type: 'listening', title: 'Listening Practice', duration: 30, order_no: 1 }],
      writing: [{ mock_test_id: test.id, type: 'writing', title: 'Writing Practice', duration: 60, order_no: 1 }],
      writing_task_1: [{ mock_test_id: test.id, type: 'writing', title: 'Writing Task 1 Practice', duration: 30, order_no: 1 }],
      writing_task_2: [{ mock_test_id: test.id, type: 'writing', title: 'Writing Task 2 Practice', duration: 50, order_no: 1 }]
    };

    const defaultSections = practiceTemplates[section_template] || [
          { mock_test_id: test.id, type: 'listening', title: 'Listening Section', duration: 30, order_no: 1 },
          { mock_test_id: test.id, type: 'reading', title: 'Reading Section', duration: 60, order_no: 2 },
          { mock_test_id: test.id, type: 'writing', title: 'Writing Section', duration: 60, order_no: 3 }
        ];

    const { data: createdSections, error: sectionError } = await supabaseAdmin
      .from('test_sections')
      .insert(defaultSections)
      .select();

    if (sectionError) throw sectionError;

    if (['writing', 'writing_task_1', 'writing_task_2'].includes(section_template) && createdSections?.[0]?.id) {
      const { error: groupError } = await supabaseAdmin
        .from('question_groups')
        .insert([{
          section_id: createdSections[0].id,
          title: 'Writing Tasks',
          instruction: '',
          passage: '',
          order_no: 1
        }]);

      if (groupError) throw groupError;
    }

    res.status(201).json(test);
  } catch (err) {
    console.error('createTest Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to create mock test.' });
  }
};

// Update mock test details (Admin Only)
export const updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, is_demo, is_published, duration } = req.body;

    const { data: test, error } = await supabaseAdmin
      .from('mock_tests')
      .update({ title, description, is_demo, is_published, duration })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const { data: sections, error: sectionError } = await supabaseAdmin
      .from('test_sections')
      .select('id, mock_test_id, type, title, duration, order_no')
      .eq('mock_test_id', id)
      .order('order_no', { ascending: true });

    if (sectionError) throw sectionError;

    res.status(200).json({
      ...test,
      sections: sections || []
    });
  } catch (err) {
    console.error('updateTest Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to update mock test.' });
  }
};

// Delete mock test (Admin Only)
export const deleteTest = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('mock_tests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Mock test deleted successfully.' });
  } catch (err) {
    console.error('deleteTest Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to delete mock test.' });
  }
};

// Duplicate an entire mock test with all its sections, question groups, and questions
export const duplicateTest = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch existing mock test
    const { data: sourceTest, error: testError } = await supabaseAdmin
      .from('mock_tests')
      .select('*')
      .eq('id', id)
      .single();

    if (testError || !sourceTest) {
      return res.status(404).json({ error: 'NotFoundError', message: 'Source mock test not found.' });
    }

    // 2. Insert new mock test with "Copy" suffix
    const { data: newTest, error: newTestError } = await supabaseAdmin
      .from('mock_tests')
      .insert([{
        title: `${sourceTest.title} (Copy)`,
        description: sourceTest.description,
        audio_file: sourceTest.audio_file,
        is_demo: false,
        is_published: false,
        duration: sourceTest.duration,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (newTestError) throw newTestError;

    // 3. Fetch source sections
    const { data: sourceSections, error: secError } = await supabaseAdmin
      .from('test_sections')
      .select('*')
      .eq('mock_test_id', id);

    if (secError) throw secError;

    // 4. Duplicate each section along with nested child sets
    for (const section of sourceSections) {
      const { data: newSection, error: newSecError } = await supabaseAdmin
        .from('test_sections')
        .insert([{
          mock_test_id: newTest.id,
          type: section.type,
          title: section.title,
          duration: section.duration,
          order_no: section.order_no
        }])
        .select()
        .single();

      if (newSecError) throw newSecError;

      // Fetch source question groups inside this section
      const { data: sourceGroups, error: grpError } = await supabaseAdmin
        .from('question_groups')
        .select('*')
        .eq('section_id', section.id);

      if (grpError) throw grpError;

      for (const group of sourceGroups) {
        const { data: newGroup, error: newGrpError } = await supabaseAdmin
          .from('question_groups')
          .insert([{
            section_id: newSection.id,
            title: group.title,
            instruction: group.instruction,
            passage: group.passage,
            audio_url: group.audio_url,
            image_url: group.image_url,
            order_no: group.order_no
          }])
          .select()
          .single();

        if (newGrpError) throw newGrpError;

        // Fetch source questions inside this group
        const { data: sourceQuestions, error: qError } = await supabaseAdmin
          .from('questions')
          .select('*')
          .eq('group_id', group.id);

        if (qError) throw qError;

        if (sourceQuestions.length > 0) {
          const insertQuestions = sourceQuestions.map(q => ({
            group_id: newGroup.id,
            question_type: q.question_type,
            question_number: q.question_number,
            question_text: q.question_text,
            instruction: q.instruction,
            options_json: q.options_json,
            correct_answers_json: q.correct_answers_json,
            extra_data_json: q.extra_data_json,
            marks: q.marks,
            order_no: q.order_no
          }));

          const { error: newQError } = await supabaseAdmin
            .from('questions')
            .insert(insertQuestions);

          if (newQError) throw newQError;
        }
      }
    }

    res.status(201).json({
      message: 'Mock test duplicated successfully.',
      duplicated_test_id: newTest.id
    });
  } catch (err) {
    console.error('duplicateTest Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to duplicate test.' });
  }
};
