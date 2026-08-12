const imagePath = (folder: string, fileName: string, query = '') =>
  `/images/${encodeURIComponent(folder)}/${encodeURIComponent(fileName)}${query}`;

const rootImage = (fileName: string) => `/images/${encodeURIComponent(fileName)}`;

export const assets = {
  dashboard: {
    cover: rootImage('cover.png'),
  },
  practice: {
    reading: imagePath('practice', 'reading.png'),
    listening: imagePath('practice', 'listening.png'),
    writing: imagePath('practice', 'writing.png'),
  },
  readingPractice: {
    background: imagePath('Reading Practice', 'background.png'),
    complete: imagePath('Reading Practice', 'complete-clean.png'),
    passage1: imagePath('Reading Practice', 'passage1-clean.png'),
    passage2: imagePath('Reading Practice', 'passage2-clean.png'),
    passage3: imagePath('Reading Practice', 'passage3-clean.png'),
    badge1: imagePath('Reading Practice', '1-clean.png'),
    badge2: imagePath('Reading Practice', '2-clean.png'),
    badge3: imagePath('Reading Practice', '3-clean.png'),
    book: '/images/Reading%20Practice/Book,png-clean.png',
    tfng: imagePath('Reading Practice', 'TFNG-clean.png'),
    tfngFocus: imagePath('Reading Practice', 'Tfng Focus-clean.png'),
    heading: imagePath('Reading Practice', 'heading-clean.png'),
    headingFocus: imagePath('Reading Practice', 'heading foucs-clean.png'),
    hootyTips: imagePath('Reading Practice', "hooty's typs.png"),
    hootyTipsNote: imagePath('Reading Practice', 'hooty-tip-note-cropped.png'),
    hootyLight: imagePath('Reading Practice', "hooty's light-clean.png"),
    hootyMascot: imagePath('Reading Practice', "hooty's moscot-clean.png"),
    pen: imagePath('Reading Practice', 'pen-cutout.png'),
  },
  writingPractice: {
    background: imagePath('Writing Practice', 'background.png'),
    header: imagePath('Writing Practice', 'header.png'),
    notes: imagePath('Writing Practice', 'notes-cutout.png'),
    footer: imagePath('Writing Practice', 'futter-cutout.png'),
    task1: imagePath('Writing Practice', 'writing task 1-cutout.png'),
    task2: imagePath('Writing Practice', 'writing task 2-cutout.png'),
    fullTest: imagePath('Writing Practice', 'full test-cutout.png'),
  },
  recordedCourses: {
    background: imagePath('Recorded Courses', 'background.png'),
    header: imagePath('Recorded Courses', 'header.png'),
    reading: imagePath('Recorded Courses', 'Reading.png'),
    listening: imagePath('Recorded Courses', 'listening.png'),
    speaking: imagePath('Recorded Courses', 'speaking.png'),
    writingTask1: imagePath('Recorded Courses', 'writing task 1.png'),
    writingTask2: imagePath('Recorded Courses', 'writing task 2.png'),
  },
  transition: {
    jawaafIeltsCutout: imagePath('transition', 'jawaafielts-cutout.png'),
  },
  videoCourse: {
    popcorn: imagePath('video course', 'popcorn-cutout.png', '?v=2'),
    notes: imagePath('video course', 'notes-cutout.png', '?v=2'),
    watchStamp: imagePath('video course', 'watch-transparent.png'),
    nowShowingStamp: imagePath('video course', 'now-showing-transparent.png'),
    reelRing: imagePath('video course', 'ring-transparent.png'),
  },
  premiumAccess: {
    background: imagePath('premium access', 'background.png'),
    active: imagePath('premium access', 'active.png'),
  },
  otpVerification: {
    messageBubble: imagePath('OTP Verifications', 'message_icon-user-clean2.png'),
    mascot: imagePath('OTP Verifications', 'moscot2-clean3.png'),
    shield: imagePath('OTP Verifications', 'tick-clean3.png'),
    topMessage: imagePath('OTP Verifications', 'top_message-clean3.png'),
  },
  writingTask1: {
    londonBackground: rootImage('london-bg.png'),
    chartIcons: {
      lineGraph: imagePath('chart-icons', 'line-graph.png'),
      barGraph: imagePath('chart-icons', 'bar-graph.png'),
      table: imagePath('chart-icons', 'table-graph.png'),
      pieChart: imagePath('chart-icons', 'pie-chart.png'),
      process: imagePath('chart-icons', 'process.png'),
      map: imagePath('chart-icons', 'map.png'),
      mixedQuestions: imagePath('chart-icons', 'mixquestion-graph.png'),
    },
    flatIcons: {
      lineGraph: imagePath('flat-icons', 'line-graph.png'),
      barGraph: imagePath('flat-icons', 'bar-graph.png'),
      table: imagePath('flat-icons', 'table-graph.png'),
      pieChart: imagePath('flat-icons', 'pie-chart.png'),
      process: imagePath('flat-icons', 'process.png'),
      map: imagePath('flat-icons', 'map.png'),
      mixedQuestions: imagePath('flat-icons', 'mixquestion-graph.png'),
    },
  },
  writingTask2: {
    heroCover: imagePath('task2-assets', 'hero-bg-cover.png'),
    heroMain: imagePath('task2-assets', 'hero-bg-main.png'),
    opinion: imagePath('task2-assets', 'IMG_6538.PNG'),
    discussion: imagePath('task2-assets', 'IMG_6539.PNG'),
    opinionDiscussion: imagePath('task2-assets', 'IMG_6540.PNG'),
    mixed: imagePath('task2-assets', 'IMG_6541.PNG'),
  },
} as const;

export type AppAssets = typeof assets;
