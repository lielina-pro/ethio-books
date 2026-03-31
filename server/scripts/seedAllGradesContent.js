const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const { Content } = require('../models/Content');
const { User } = require('../models/User');

async function seedAllGrades() {
  await connectDB();

  const uploader =
    (await User.findOne({ role: 'admin' }).select('_id fullName')) ||
    (await User.findOne({ role: 'tutor', tutorStatus: 'approved' }).select('_id fullName'));

  if (!uploader) {
    console.log('No admin or approved tutor found to use as uploadedBy.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const contentForAllGrades = [
    {
      title: 'Grade 7 Mathematics - Algebra Basics',
      grade: 7,
      contentType: 'textbook',
      isPremium: false,
      accessType: 'free',
      subject: 'Mathematics',
      status: 'approved',
      moderationStatus: 'approved',
      description: 'Learn algebra fundamentals for grade 7 students',
      pdfUrl: 'https://example.com/grade7-math.pdf'
    },
    {
      title: 'Grade 8 Physics - Introduction to Forces',
      grade: 8,
      contentType: 'textbook',
      isPremium: false,
      accessType: 'free',
      subject: 'Physics',
      status: 'approved',
      moderationStatus: 'approved',
      description: 'Understand basic forces and motion for grade 8',
      pdfUrl: 'https://example.com/grade8-physics.pdf'
    },
    {
      title: 'Grade 9 Biology - Cells and Systems',
      grade: 9,
      contentType: 'textbook',
      isPremium: false,
      accessType: 'free',
      subject: 'Biology',
      status: 'approved',
      moderationStatus: 'approved',
      description: 'Explore cell biology and body systems for grade 9',
      pdfUrl: 'https://example.com/grade9-biology.pdf'
    },
    {
      title: 'Grade 10 Chemistry - Atomic Structure',
      grade: 10,
      contentType: 'textbook',
      isPremium: false,
      accessType: 'free',
      subject: 'Chemistry',
      status: 'approved',
      moderationStatus: 'approved',
      description: 'Learn about atoms and chemical bonding for grade 10',
      pdfUrl: 'https://example.com/grade10-chemistry.pdf'
    },
    {
      title: 'Grade 11 Mathematics - Calculus Basics',
      grade: 11,
      contentType: 'textbook',
      isPremium: true,
      accessType: 'paid',
      priceEtb: 80,
      subject: 'Mathematics',
      status: 'approved',
      moderationStatus: 'approved',
      description: 'Introduction to calculus for advanced students',
      pdfUrl: 'https://example.com/grade11-calculus.pdf'
    },
    {
      title: 'Grade 12 Physics - Advanced Mechanics',
      grade: 12,
      contentType: 'textbook',
      isPremium: true,
      accessType: 'paid',
      priceEtb: 100,
      subject: 'Physics',
      status: 'approved',
      moderationStatus: 'approved',
      description: 'Advanced physics concepts for grade 12 students',
      pdfUrl: 'https://example.com/grade12-physics.pdf'
    }
  ];

  console.log('📚 Seeding content for all grades (7-12)...');
  console.log(`Using uploader: ${uploader.fullName}`);

  for (const item of contentForAllGrades) {
    const payload = {
      ...item,
      uploadedBy: uploader._id
    };

    const existing = await Content.findOne({
      title: item.title,
      grade: item.grade
    }).select('_id');

    if (existing) {
      await Content.updateOne({ _id: existing._id }, { $set: payload });
      console.log(`✅ Updated: ${item.title}`);
    } else {
      await Content.create(payload);
      console.log(`✅ Created: ${item.title}`);
    }
  }

  const allContent = await Content.find({}, { grade: 1, title: 1, _id: 0 });
  const grades = [...new Set(allContent.map((c) => c.grade))].sort((a, b) => a - b);
  console.log('\n📚 Grades now in database:', grades);
  console.log('📚 Total content items:', allContent.length);

  await mongoose.disconnect();
  console.log('\n✅ Seeding completed!');
}

seedAllGrades().catch(async (err) => {
  console.error('❌ Seed error:', err);
  await mongoose.disconnect();
  process.exit(1);
});

