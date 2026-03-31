const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Content } = require('../models/Content');
const { User } = require('../models/User');

async function run() {
  await connectDB();

  // Find an admin to attribute content to
  const admin = await User.findOne({ role: 'admin' });
  const uploader = admin || (await User.findOne({ role: 'tutor', tutorStatus: 'approved' }));

  if (!uploader) {
    console.log('No admin/approved tutor found. Create an admin first.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('Using uploader:', uploader.fullName);

  // Clear existing content
  console.log('Clearing existing content...');
  await Content.deleteMany({});
  console.log('Existing content cleared.');

  const sampleItems = [
    {
      title: 'Grade 10 Mathematics - Algebra Complete Guide',
      subject: 'Mathematics',
      grade: 10,
      description: 'Complete algebra textbook covering equations, functions, graphs.',
      contentType: 'textbook',  // Using contentType as model expects
      pdfUrl: 'https://drive.google.com/file/d/1rItTIAqA3wldd2WqOzMMEea4acYHQ1Tk/preview',
      isPremium: false
    },
    {
      title: 'Physics - Motion and Forces Textbook',
      subject: 'Physics',
      grade: 10,
      description: 'Comprehensive guide to Newton\'s laws, kinematics, and forces.',
      contentType: 'textbook',
      pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      isPremium: false
    },
    {
      title: 'Advanced Calculus - Differentiation and Integration',
      subject: 'Mathematics',
      grade: 12,
      description: 'Premium calculus textbook for advanced students.',
      contentType: 'textbook',
      pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      isPremium: true
    },
    {
      title: 'Physics - Motion and Forces Quiz',
      subject: 'Physics',
      grade: 10,
      description: 'Test your knowledge of motion, forces, and Newton\'s laws.',
      contentType: 'quiz',
      quizData: {
        questions: [
          {
            question: 'Which quantity is a vector?',
            options: ['Speed', 'Distance', 'Velocity', 'Time'],
            correct: 2  // Index: 0=Speed, 1=Distance, 2=Velocity, 3=Time
          },
          {
            question: 'Newton\'s second law is:',
            options: ['F = ma', 'E = mc²', 'V = IR', 'P = IV'],
            correct: 0
          },
          {
            question: 'If net force is zero, an object:',
            options: ['Must be at rest', 'Must be accelerating', 'Moves with constant velocity', 'Always changes direction'],
            correct: 2
          },
          {
            question: 'The SI unit of force is:',
            options: ['Watt', 'Newton', 'Joule', 'Pascal'],
            correct: 1
          }
        ]
      },
      isPremium: false
    },
    {
      title: 'Physics Problem Solving - Work and Energy',
      subject: 'Physics',
      grade: 11,
      description: 'Video tutorial on work-energy theorem.',
      contentType: 'video',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      isPremium: false
    },
    {
      title: 'Calculus Introduction - Video Tutorial',
      subject: 'Mathematics',
      grade: 12,
      description: 'Learn calculus basics with step-by-step explanations.',
      contentType: 'video',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      isPremium: true
    }
  ];

  // Insert content
  for (const item of sampleItems) {
    try {
      await Content.create({ ...item, uploadedBy: uploader._id });
      console.log('✅ Created:', item.title);
    } catch (error) {
      console.error('❌ Error:', item.title, error.message);
    }
  }

  // Update tutors
  console.log('\nUpdating tutor marketplace fields...');
  const tutors = await User.find({ role: 'tutor', tutorStatus: 'approved' });
  
  for (const t of tutors) {
    t.subjects = t.subjects?.length ? t.subjects : ['Mathematics', 'Physics'];
    t.hourlyRate = typeof t.hourlyRate === 'number' ? t.hourlyRate : 200;
    t.bio = t.bio || 'Dedicated tutor helping students succeed.';
    t.achievements = t.achievements || 'Experienced tutor with proven results.';
    t.averageRating = t.averageRating || 4.5;
    await t.save();
    console.log('✅ Updated:', t.fullName);
  }

  // Verify
  const contentCount = await Content.countDocuments();
  console.log(`\n📚 Total content: ${contentCount}`);
  
  const textbooks = await Content.countDocuments({ contentType: 'textbook' });
  const quizzes = await Content.countDocuments({ contentType: 'quiz' });
  const videos = await Content.countDocuments({ contentType: 'video' });
  console.log(`Textbooks: ${textbooks}, Quizzes: ${quizzes}, Videos: ${videos}`);

  await mongoose.disconnect();
  console.log('\n✅ Seeding completed!');
}

run().catch(async (err) => {
  console.error('❌ Seed error:', err);
  await mongoose.disconnect();
  process.exit(1);
});