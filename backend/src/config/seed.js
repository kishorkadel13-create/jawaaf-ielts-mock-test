import { supabaseAdmin } from './supabase.js';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // 1. Create / Verify Users
    let adminId = null;
    let studentId = null;

    console.log('👤 Setting up administrative and student user accounts...');
    
    // Check if admin user already exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const existingAdmin = users.find(u => u.email === 'admin@jawaaf.com');
    if (existingAdmin) {
      adminId = existingAdmin.id;
      console.log('✓ Admin user exists:', adminId);
    } else {
      const { data: newAdmin, error: adminCreateError } = await supabaseAdmin.auth.admin.createUser({
        email: 'admin@jawaaf.com',
        password: 'Password123!',
        email_confirm: true,
        user_metadata: {
          full_name: 'Jawaaf Admin',
          role: 'admin'
        }
      });
      if (adminCreateError) throw adminCreateError;
      adminId = newAdmin.user.id;
      console.log('✓ Admin user created:', adminId);
    }

    const existingStudent = users.find(u => u.email === 'student@jawaaf.com');
    if (existingStudent) {
      studentId = existingStudent.id;
      console.log('✓ Student user exists:', studentId);
    } else {
      const { data: newStudent, error: studentCreateError } = await supabaseAdmin.auth.admin.createUser({
        email: 'student@jawaaf.com',
        password: 'Password123!',
        email_confirm: true,
        user_metadata: {
          full_name: 'Jawaaf Student',
          role: 'student'
        }
      });
      if (studentCreateError) throw studentCreateError;
      studentId = newStudent.user.id;
      console.log('✓ Student user created:', studentId);
    }

    // Give database triggers a moment to write profiles
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Force update/insert profile roles and access flags to be absolutely certain
    const { data: existingAdminProf } = await supabaseAdmin.from('profiles').select('id').eq('id', adminId).single();
    if (!existingAdminProf) {
      await supabaseAdmin.from('profiles').insert([{
        id: adminId,
        full_name: 'Jawaaf Admin',
        email: 'admin@jawaaf.com',
        role: 'admin',
        has_full_access: true
      }]);
      console.log('✓ Admin profile created.');
    } else {
      await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin', has_full_access: true })
        .eq('id', adminId);
      console.log('✓ Admin profile updated.');
    }

    const { data: existingStudentProf } = await supabaseAdmin.from('profiles').select('id').eq('id', studentId).single();
    if (!existingStudentProf) {
      await supabaseAdmin.from('profiles').insert([{
        id: studentId,
        full_name: 'Jawaaf Student',
        email: 'student@jawaaf.com',
        role: 'student',
        has_full_access: false
      }]);
      console.log('✓ Student profile created.');
    } else {
      await supabaseAdmin
        .from('profiles')
        .update({ role: 'student', has_full_access: false })
        .eq('id', studentId);
      console.log('✓ Student profile updated.');
    }

    console.log('✓ Profile roles and permissions verified.');

    // 2. Clear Existing Tests to avoid duplicates
    console.log('🧹 Cleaning old mock test data...');
    const { data: oldTests } = await supabaseAdmin.from('mock_tests').select('id').in('title', [
      'IELTS Academic Reading Practice Test 1',
      'IELTS Listening Practice Test 1'
    ]);
    if (oldTests && oldTests.length > 0) {
      const oldIds = oldTests.map(t => t.id);
      await supabaseAdmin.from('mock_tests').delete().in('id', oldIds);
      console.log('✓ Deleted old test structures.');
    }

    // 3. SEED READING MOCK TEST
    console.log('📖 Seeding Reading Mock Test...');
    const { data: readingTest, error: rTestErr } = await supabaseAdmin
      .from('mock_tests')
      .insert([{
        title: 'IELTS Academic Reading Practice Test 1',
        description: 'A complete Academic Reading Mock Exam simulating computer-based examination conditions. Read the three passages and answer 40 questions. Duration: 60 minutes.',
        is_demo: true,
        is_published: true,
        duration: 60,
        created_by: adminId
      }])
      .select()
      .single();

    if (rTestErr) throw rTestErr;
    console.log('✓ Reading Test inserted:', readingTest.id);

    // --- READING SECTION 1 ---
    const { data: sec1, error: sec1Err } = await supabaseAdmin
      .from('test_sections')
      .insert([{
        mock_test_id: readingTest.id,
        type: 'reading',
        title: 'Reading Passage 1: The Impact of Climate Change on Coral Reefs',
        order_no: 1
      }])
      .select()
      .single();
    if (sec1Err) throw sec1Err;

    const passage1HTML = `
      <div class="space-y-4">
        <p><strong>A.</strong> Coral reefs are among the most diverse and productive ecosystems on Earth. Often referred to as the 'rainforests of the sea', they provide shelter, breeding grounds, and feeding areas for approximately 25% of all marine species, despite covering less than 0.1% of the ocean floor. However, these delicate structures are highly sensitive to changes in water temperature and acidity, making them key indicators of global environmental shifts.</p>
        <p><strong>B.</strong> Over the past three decades, rising ocean temperatures triggered by climate change have led to widespread coral bleaching events. Bleaching occurs when corals, stressed by thermal anomalies, expel the microscopic, symbiotic algae called zooxanthellae that live in their tissues. These algae are responsible for the corals' vibrant colors and, more importantly, supply them with up to 90% of their energy through photosynthesis. Without zooxanthellae, the coral turns stark white and begins to starve.</p>
        <p><strong>C.</strong> Although bleached corals are not immediately dead, they are extremely vulnerable to disease and starvation. If water temperatures return to normal within a few weeks, some corals can re-acquire zooxanthellae and slowly recover. However, prolonged heatwaves result in high coral mortality rates, leaving skeletal structures that quickly degrade. This loss of physical reef complexity has severe knock-on effects, reducing habitat options for fish and invertebrates.</p>
        <p><strong>D.</strong> Another looming threat is ocean acidification, which is caused by the oceans absorbing excess carbon dioxide (CO2) from the atmosphere. When CO2 dissolves in seawater, it forms carbonic acid, reducing the pH of the ocean. This chemical shift decreases the availability of carbonate ions, which corals require to build their calcium carbonate skeletons. Consequently, reef construction slows down, and existing structures become brittle and prone to storm damage.</p>
        <p><strong>E.</strong> The collapse of coral reef ecosystems has profound socio-economic impacts. Hundreds of millions of people worldwide rely on reefs for coastal protection, food security, and tourism-related income. Healthy reefs act as natural breakwaters, absorbing wave energy and reducing coastal erosion during severe storms. The decline in reef quality threatens the livelihood of coastal populations and impacts global seafood supplies.</p>
      </div>
    `;

    const { data: grp1, error: grp1Err } = await supabaseAdmin
      .from('question_groups')
      .insert([{
        section_id: sec1.id,
        title: 'Questions 1 - 7',
        instruction: 'Do the following statements agree with the information given in Reading Passage 1? In boxes 1-7, select TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.',
        passage: passage1HTML,
        order_no: 1
      }])
      .select()
      .single();
    if (grp1Err) throw grp1Err;

    const questionsSec1Grp1 = [
      { num: 1, text: 'Coral reefs support a quarter of all marine life.', type: 'TRUE_FALSE_NOT_GIVEN', ans: ['TRUE'] },
      { num: 2, text: 'Climate change has had no measurable effect on coral reefs over the last 30 years.', type: 'TRUE_FALSE_NOT_GIVEN', ans: ['FALSE'] },
      { num: 3, text: 'Ocean acidification helps corals construct calcium carbonate skeletons faster.', type: 'TRUE_FALSE_NOT_GIVEN', ans: ['FALSE'] },
      { num: 4, text: 'Corals get most of their energy from the symbiotic algae living in their tissues.', type: 'TRUE_FALSE_NOT_GIVEN', ans: ['TRUE'] },
      { num: 5, text: 'Bleaching instantly kills the coral skeleton.', type: 'TRUE_FALSE_NOT_GIVEN', ans: ['FALSE'] },
      { num: 6, text: 'Widespread coral mortality reduces the structural complexity of reefs.', type: 'TRUE_FALSE_NOT_GIVEN', ans: ['TRUE'] },
      { num: 7, text: 'The economic value of coral reef tourism is decreasing rapidly in developing countries.', type: 'TRUE_FALSE_NOT_GIVEN', ans: ['NOT GIVEN'] }
    ];

    for (const q of questionsSec1Grp1) {
      await supabaseAdmin.from('questions').insert([{
        group_id: grp1.id,
        question_type: q.type,
        question_number: q.num,
        question_text: q.text,
        correct_answers_json: q.ans,
        order_no: q.num
      }]);
    }

    const { data: grp2, error: grp2Err } = await supabaseAdmin
      .from('question_groups')
      .insert([{
        section_id: sec1.id,
        title: 'Questions 8 - 13',
        instruction: 'Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
        passage: passage1HTML,
        order_no: 2
      }])
      .select()
      .single();
    if (grp2Err) throw grp2Err;

    const questionsSec1Grp2 = [
      { num: 8, text: 'Coral bleaching is primarily triggered by rising [blank] in ocean waters.', type: 'INPUT_TEXT', ans: ['temperature', 'temperatures'] },
      { num: 9, text: 'Acidification occurs when oceans absorb excess [blank] from the atmosphere.', type: 'INPUT_TEXT', ans: ['carbon dioxide', 'co2'] },
      { num: 10, text: 'Bleaching involves corals expelling the symbiotic microalgae known as [blank].', type: 'INPUT_TEXT', ans: ['zooxanthellae'] },
      { num: 11, text: 'A decrease in reef structures leads to severe [blank] of coastlines.', type: 'INPUT_TEXT', ans: ['erosion'] },
      { num: 12, text: 'Reef tourism provides a source of income for many [blank] populations.', type: 'INPUT_TEXT', ans: ['coastal', 'local'] },
      { num: 13, text: 'Reducing global carbon emissions is vital to secure the future [blank] of coral reefs.', type: 'INPUT_TEXT', ans: ['survival', 'protection'] }
    ];

    for (const q of questionsSec1Grp2) {
      await supabaseAdmin.from('questions').insert([{
        group_id: grp2.id,
        question_type: q.type,
        question_number: q.num,
        question_text: q.text,
        correct_answers_json: q.ans,
        order_no: q.num
      }]);
    }

    // --- READING SECTION 2 ---
    const { data: sec2, error: sec2Err } = await supabaseAdmin
      .from('test_sections')
      .insert([{
        mock_test_id: readingTest.id,
        type: 'reading',
        title: 'Reading Passage 2: The History of the Printing Press',
        order_no: 2
      }])
      .select()
      .single();
    if (sec2Err) throw sec2Err;

    const passage2HTML = `
      <div class="space-y-4">
        <p><strong>Paragraph A:</strong> The development of movable type printing in the mid-15th century by Johannes Gutenberg is widely regarded as one of the most influential events in human history. Prior to this innovation, books were laboriously copied by hand, mostly by monastic scribes. This manual process made books extremely rare, expensive, and accessible only to the wealthy elite and religious authorities.</p>
        <p><strong>Paragraph B:</strong> Gutenberg's genius lay in combining existing technologies—such as olive presses and metal casting—into a single, efficient system. He created durable metal alloys for individual characters, developed oil-based inks that would adhere to metal, and designed a wooden press that applied uniform pressure. This enabled the mass production of uniform pages, dramatically dropping the cost of reproduction.</p>
        <p><strong>Paragraph C:</strong> The impact was immediate. Within a few decades, printing shops sprang up in major cities across Europe. The availability of relatively cheap texts fueled a rapid rise in literacy rates among the middle class. Information, once controlled by a select few, began to flow freely, setting the stage for major intellectual movements like the Scientific Revolution and the Renaissance.</p>
        <p><strong>Paragraph D:</strong> As printing expanded, it also standardizes regional languages. Early printers favored dominant dialects to maximize sales, leading to the decline of local variations. Scientific charts, anatomical diagrams, and maps could now be reproduced with absolute precision, preventing copying errors that had plagued hand-written transcripts for centuries.</p>
      </div>
    `;

    const { data: grp3, error: grp3Err } = await supabaseAdmin
      .from('question_groups')
      .insert([{
        section_id: sec2.id,
        title: 'Questions 14 - 17',
        instruction: 'Choose the correct heading for Paragraphs A-D from the list of headings below.',
        passage: passage2HTML,
        order_no: 1
      }])
      .select()
      .single();
    if (grp3Err) throw grp3Err;

    const headings = [
      'i. Technical mechanics of the press',
      'ii. Socio-economic shifts and literacy',
      'iii. Gutenberg\'s early life and failures',
      'iv. Pre-printing conditions of book production',
      'v. Linguistic standardization and chart accuracy',
      'vi. The decline of print in the modern era'
    ];

    const questionsSec2Grp3 = [
      { num: 14, text: 'Paragraph A', type: 'MATCHING', ans: ['iv'], options: headings },
      { num: 15, text: 'Paragraph B', type: 'MATCHING', ans: ['i'], options: headings },
      { num: 16, text: 'Paragraph C', type: 'MATCHING', ans: ['ii'], options: headings },
      { num: 17, text: 'Paragraph D', type: 'MATCHING', ans: ['v'], options: headings }
    ];

    for (const q of questionsSec2Grp3) {
      await supabaseAdmin.from('questions').insert([{
        group_id: grp3.id,
        question_type: q.type,
        question_number: q.num,
        question_text: q.text,
        options_json: q.options,
        correct_answers_json: q.ans,
        order_no: q.num
      }]);
    }

    const { data: grp4, error: grp4Err } = await supabaseAdmin
      .from('question_groups')
      .insert([{
        section_id: sec2.id,
        title: 'Questions 18 - 20',
        instruction: 'Choose the correct letter, A, B, C or D.',
        passage: passage2HTML,
        order_no: 2
      }])
      .select()
      .single();
    if (grp4Err) throw grp4Err;

    const questionsSec2Grp4 = [
      {
        num: 18,
        text: 'Before the printing press was invented, books were:',
        type: 'SINGLE_MCQ',
        options: ['A) Hand-written by monastic scribes', 'B) Imported exclusively from East Asia', 'C) Cheaply printed on wooden boards', 'D) Destroyed by local rulers'],
        ans: ['A']
      },
      {
        num: 19,
        text: 'Which of the following was NOT an invention Gutenberg combined into his system?',
        type: 'SINGLE_MCQ',
        options: ['A) Oil-based inks', 'B) Uniform metal alloy characters', 'C) Steam-powered engines', 'D) Adjusted screw presses'],
        ans: ['C']
      },
      {
        num: 20,
        text: 'Linguistic standardization occurred because printers:',
        type: 'SINGLE_MCQ',
        options: ['A) Wanted to support local governments', 'B) Favored popular dialects to maximize profits', 'C) Were ordered to do so by religious leaders', 'D) Could not cast local letters in metal'],
        ans: ['B']
      }
    ];

    for (const q of questionsSec2Grp4) {
      await supabaseAdmin.from('questions').insert([{
        group_id: grp4.id,
        question_type: q.type,
        question_number: q.num,
        question_text: q.text,
        options_json: q.options,
        correct_answers_json: q.ans,
        order_no: q.num
      }]);
    }

    // --- READING SECTION 3 ---
    const { data: sec3, error: sec3Err } = await supabaseAdmin
      .from('test_sections')
      .insert([{
        mock_test_id: readingTest.id,
        type: 'reading',
        title: 'Reading Passage 3: The Psychology of Motivation',
        order_no: 3
      }])
      .select()
      .single();
    if (sec3Err) throw sec3Err;

    const passage3HTML = `
      <div class="space-y-4">
        <p><strong>A.</strong> Human motivation is a complex psychological construct that dictates how individuals initiate, guide, and maintain goal-oriented behaviors. Psychologists generally divide motivation into two primary forms: intrinsic and extrinsic. Intrinsic motivation refers to behavior driven by internal rewards. In other words, the motivation to engage in a behavior arises from within the individual because it is naturally satisfying, enjoyable, or meaningful.</p>
        <p><strong>B.</strong> Extrinsic motivation, on the other hand, involves performing an activity to earn external rewards or avoid punishments. Common extrinsic rewards include money, grades, praise, and social status. While extrinsic motivators can be highly effective in the short term, studies suggest they can sometimes undermine intrinsic interest, a phenomenon known as the overjustification effect.</p>
        <p><strong>C.</strong> Decy and Ryan's Self-Determination Theory (SDT) suggests that humans have three basic psychological needs that must be satisfied for optimal motivation and growth: autonomy, competence, and relatedness. Autonomy is the need to feel in control of one's own actions and goals. Competence is the need to experience mastery and feel effective. Relatedness is the need to feel a sense of belonging and attachment to others.</p>
      </div>
    `;

    const { data: grp5, error: grp5Err } = await supabaseAdmin
      .from('question_groups')
      .insert([{
        section_id: sec3.id,
        title: 'Questions 21 - 26',
        instruction: 'Complete the summary. Choose the correct option from the dropdown selection.',
        passage: passage3HTML,
        order_no: 1
      }])
      .select()
      .single();
    if (grp5Err) throw grp5Err;

    const questionsSec3Grp5 = [
      { num: 21, text: 'Intrinsic motivation is driven by [blank] factors.', type: 'DROPDOWN_SELECT', options: ['internal', 'external', 'social', 'financial'], ans: ['internal'] },
      { num: 22, text: 'Extrinsic motivation involves pursuing [blank] rewards.', type: 'DROPDOWN_SELECT', options: ['psychological', 'external', 'biological', 'emotional'], ans: ['external'] },
      { num: 23, text: 'Too many extrinsic incentives can [blank] intrinsic interest.', type: 'DROPDOWN_SELECT', options: ['stabilize', 'enhance', 'decrease', 'ignore'], ans: ['decrease'] },
      { num: 24, text: 'Self-Determination Theory defines autonomy, competence, and [blank] as human needs.', type: 'DROPDOWN_SELECT', options: ['relatedness', 'wealth', 'power', 'popularity'], ans: ['relatedness'] },
      { num: 25, text: 'Autonomy is the sense of control over one\'s own [blank].', type: 'DROPDOWN_SELECT', options: ['finances', 'actions', 'friends', 'society'], ans: ['actions'] },
      { num: 26, text: 'Competence involves feeling [blank] in executing tasks.', type: 'DROPDOWN_SELECT', options: ['effective', 'ineffective', 'anxious', 'isolated'], ans: ['effective'] }
    ];

    for (const q of questionsSec3Grp5) {
      await supabaseAdmin.from('questions').insert([{
        group_id: grp5.id,
        question_type: q.type,
        question_number: q.num,
        question_text: q.text,
        options_json: q.options,
        correct_answers_json: q.ans,
        order_no: q.num
      }]);
    }

    const { data: grp6, error: grp6Err } = await supabaseAdmin
      .from('question_groups')
      .insert([{
        section_id: sec3.id,
        title: 'Questions 27 - 31',
        instruction: 'Do the following statements agree with the views of the writer? Select YES, NO or NOT GIVEN.',
        passage: passage3HTML,
        order_no: 2
      }])
      .select()
      .single();
    if (grp6Err) throw grp6Err;

    const questionsSec3Grp6 = [
      { num: 27, text: 'Extrinsic rewards always damage long-term performance in any setting.', type: 'YES_NO_NOT_GIVEN', ans: ['NO'] },
      { num: 28, text: 'The overjustification effect applies to all activities and ages.', type: 'YES_NO_NOT_GIVEN', ans: ['NO'] },
      { num: 29, text: 'High levels of autonomy can improve engagement.', type: 'YES_NO_NOT_GIVEN', ans: ['YES'] },
      { num: 30, text: 'Praise is more effective than monetary bonuses in office environments.', type: 'YES_NO_NOT_GIVEN', ans: ['NOT GIVEN'] },
      { num: 31, text: 'Competence alone is sufficient to ensure high motivation.', type: 'YES_NO_NOT_GIVEN', ans: ['NO'] }
    ];

    for (const q of questionsSec3Grp6) {
      await supabaseAdmin.from('questions').insert([{
        group_id: grp6.id,
        question_type: q.type,
        question_number: q.num,
        question_text: q.text,
        correct_answers_json: q.ans,
        order_no: q.num
      }]);
    }

    const { data: grp7, error: grp7Err } = await supabaseAdmin
      .from('question_groups')
      .insert([{
        section_id: sec3.id,
        title: 'Questions 32 - 35',
        instruction: 'Choose TWO letters, A-E.',
        passage: passage3HTML,
        order_no: 3
      }])
      .select()
      .single();
    if (grp7Err) throw grp7Err;

    const multiOptions = ['A) Autonomy', 'B) Wealth', 'C) Competence', 'D) Popularity', 'E) Fame'];

    // For IELTS, multiple select questions are often split into separate questions to maintain marks balance,
    // e.g. Question 32 and Question 33 representing options. Let's make it 2 separate questions or 1 multi-select.
    // In our system, QuestionRenderer handles MULTI_SELECT by returning an array of correct letters.
    await supabaseAdmin.from('questions').insert([
      {
        group_id: grp7.id,
        question_type: 'MULTI_SELECT',
        question_number: 32,
        question_text: 'Which TWO of the following represent basic psychological needs under Self-Determination Theory?',
        options_json: multiOptions,
        correct_answers_json: ['A', 'C'],
        order_no: 1
      }
    ]);

    // Let's add dummy questions for 33-40 so the exam has a total of 40 questions to evaluate properly!
    const { data: grp8 } = await supabaseAdmin
      .from('question_groups')
      .insert([{
        section_id: sec3.id,
        title: 'Questions 33 - 40',
        instruction: 'Short answer questions. Write NO MORE THAN TWO WORDS.',
        passage: passage3HTML,
        order_no: 4
      }])
      .select()
      .single();

    for (let i = 33; i <= 40; i++) {
      await supabaseAdmin.from('questions').insert([{
        group_id: grp8.id,
        question_type: 'INPUT_TEXT',
        question_number: i,
        question_text: `Question ${i} short fill-in gap: [blank]`,
        correct_answers_json: ['mastery'],
        order_no: i
      }]);
    }

    console.log('✓ Seeded complete Reading Test (40 questions).');

    // 4. SEED PREMIUM LISTENING MOCK TEST
    console.log('🎧 Seeding Premium Listening Mock Test...');
    const { data: listeningTest, error: lTestErr } = await supabaseAdmin
      .from('mock_tests')
      .insert([{
        title: 'IELTS Listening Practice Test 1',
        description: 'This is a premium full-length IELTS Listening CBT mock exam. Consists of 4 Sections and 40 questions. Listen to the audio and answer the questions. Duration: 30 minutes.',
        is_demo: false,
        is_published: true,
        duration: 30,
        created_by: adminId
      }])
      .select()
      .single();

    if (lTestErr) throw lTestErr;
    console.log('✓ Listening Test inserted:', listeningTest.id);

    // Section 1: Library Membership Inquiry
    const { data: lSec1, error: lSec1Err } = await supabaseAdmin
      .from('test_sections')
      .insert([{
        mock_test_id: listeningTest.id,
        type: 'listening',
        title: 'Listening Section 1: Library Membership Inquiry',
        order_no: 1
      }])
      .select()
      .single();
    if (lSec1Err) throw lSec1Err;

    const { data: lGrp1, error: lGrp1Err } = await supabaseAdmin
      .from('question_groups')
      .insert([{
        section_id: lSec1.id,
        title: 'Questions 1 - 5',
        instruction: 'Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
        audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Public dummy audio
        order_no: 1
      }])
      .select()
      .single();
    if (lGrp1Err) throw lGrp1Err;

    const listeningQuestions = [
      { num: 1, text: 'Applicant Name: Sarah [blank]', ans: ['jenkins'] },
      { num: 2, text: 'Address: 14 [blank] Road', ans: ['meadow'] },
      { num: 3, text: 'Postcode: [blank]', ans: ['cb2 1qq'] },
      { num: 4, text: 'Contact Number: 07700 [blank]', ans: ['900077'] },
      { num: 5, text: 'Membership choice: [blank]', ans: ['standard', 'regular'] }
    ];

    for (const q of listeningQuestions) {
      await supabaseAdmin.from('questions').insert([{
        group_id: lGrp1.id,
        question_type: 'INPUT_TEXT',
        question_number: q.num,
        question_text: q.text,
        correct_answers_json: q.ans,
        order_no: q.num
      }]);
    }

    // Let's seed dummy questions for the rest of listening so it has questions up to 40
    for (let secNum = 2; secNum <= 4; secNum++) {
      const { data: lSec } = await supabaseAdmin
        .from('test_sections')
        .insert([{
          mock_test_id: listeningTest.id,
          type: 'listening',
          title: `Listening Section ${secNum}: Discussion`,
          order_no: secNum
        }])
        .select()
        .single();

      const { data: lGrp } = await supabaseAdmin
        .from('question_groups')
        .insert([{
          section_id: lSec.id,
          title: `Questions ${(secNum - 1) * 10 + 1} - ${secNum * 10}`,
          instruction: 'Listen and fill in the blanks.',
          audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          order_no: 1
        }])
        .select()
        .single();

      for (let i = (secNum - 1) * 10 + 1; i <= secNum * 10; i++) {
        await supabaseAdmin.from('questions').insert([{
          group_id: lGrp.id,
          question_type: 'INPUT_TEXT',
          question_number: i,
          question_text: `Listening Question ${i} blank: [blank]`,
          correct_answers_json: ['answer'],
          order_no: i
        }]);
      }
    }

    console.log('✓ Seeded Listening Test (40 questions).');
    console.log('🎉 Database seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding Error:', err);
  }
}

seed();
