const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const { Content } = require('../models/Content');
const { User } = require('../models/User');

function getPreviewUrl(url) {
  if (!url) return null;
  const match = url.match(/\/d\/([^/]+)/);
  if (match) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return url;
}

async function seedTextbooks() {
  await connectDB();

  const uploader =
    (await User.findOne({ role: 'admin' }).select('_id fullName')) ||
    (await User.findOne({ role: 'tutor', tutorStatus: 'approved' }).select('_id fullName'));

  if (!uploader) {
    console.log('No admin/approved tutor found to attach as uploadedBy.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const textbooks = [
    // FREE
    {
      title: 'Grade 7 English - Student Textbook',
      grade: 7,
      contentType: 'textbook',
      isPremium: false,
      accessType: 'free',
      subject: 'English',
      status: 'approved',
      moderationStatus: 'approved',
      description: 'Official English textbook for Grade 7 students',
      pdfUrl: getPreviewUrl('https://drive.google.com/file/d/1vX2qH6qbp5gEWntzYVZ956ZCjmdZdoeq/view?usp=sharing')
    },
    {
      title: 'Grade 7 General Science - Student Textbook',
      grade: 7,
      contentType: 'textbook',
      isPremium: false,
      accessType: 'free',
      subject: 'General Science',
      status: 'approved',
      moderationStatus: 'approved',
      description: 'Official General Science textbook for Grade 7 students',
      pdfUrl: getPreviewUrl('https://drive.google.com/file/d/1tXPq7LndaO-EM9xz5IgdDllbnhDia8Ld/view?usp=sharing')
    },
    {
      title: 'Grade 8 English - Student Textbook',
      grade: 8,
      contentType: 'textbook',
      isPremium: false,
      accessType: 'free',
      subject: 'English',
      status: 'approved',
      moderationStatus: 'approved',
      description: 'Official English textbook for Grade 8 students',
      pdfUrl: getPreviewUrl('https://drive.google.com/file/d/1vX2qH6qbp5gEWntzYVZ956ZCjmdZdoeq/view?usp=sharing')
    },
    {
      title: 'Grade 8 General Science - Student Textbook',
      grade: 8,
      contentType: 'textbook',
      isPremium: false,
      accessType: 'free',
      subject: 'General Science',
      status: 'approved',
      moderationStatus: 'approved',
      description: 'Official General Science textbook for Grade 8 students',
      pdfUrl: getPreviewUrl('https://drive.google.com/file/d/1IbOAwE48_QataZq2Ln0s9WoYEZlQGCyz/view?usp=sharing')
    },
    {
      title: 'Grade 8 Social Studies - Student Textbook',
      grade: 8,
      contentType: 'textbook',
      isPremium: false,
      accessType: 'free',
      subject: 'Social Studies',
      status: 'approved',
      moderationStatus: 'approved',
      description: 'Official Social Studies textbook for Grade 8 students',
      pdfUrl: getPreviewUrl('https://drive.google.com/file/d/1UJnrHOx4a-cbb2QwLLRnhyHgYP4jOOVi/view?usp=sharing')
    },
    // PREMIUM
    {
      title: 'Grade 7 Mathematics - Student Textbook',
      grade: 7,
      contentType: 'textbook',
      isPremium: true,
      accessType: 'paid',
      priceEtb: 200,
      subject: 'Mathematics',
      status: 'approved',
      moderationStatus: 'approved',
      description: 'Premium Mathematics textbook for Grade 7 students. Requires payment to access.',
      pdfUrl: getPreviewUrl('https://drive.google.com/file/d/119pgYW7rcYgBfEZFGBfE5GzMDWLmzire/view?usp=sharing')
    },
    {
      title: 'Grade 7 Social Studies - Student Textbook',
      grade: 7,
      contentType: 'textbook',
      isPremium: true,
      accessType: 'paid',
      priceEtb: 200,
      subject: 'Social Studies',
      status: 'approved',
      moderationStatus: 'approved',
      description: 'Premium Social Studies textbook for Grade 7 students. Requires payment to access.',
      pdfUrl: getPreviewUrl('https://drive.google.com/file/d/1_ad04P9t7ZjcGU6ttDyDKILEAjfkcWUm/view?usp=sharing')
    },
    {
      title: 'Grade 8 Amharic - Student Textbook',
      grade: 8,
      contentType: 'textbook',
      isPremium: true,
      accessType: 'paid',
      priceEtb: 200,
      subject: 'Amharic',
      status: 'approved',
      moderationStatus: 'approved',
      description: 'Premium Amharic textbook for Grade 8 students. Requires payment to access.',
      pdfUrl: getPreviewUrl('https://drive.google.com/file/d/1FwpBc8s2QIXlPjTGG1P5SdRuclF8UYky/view?usp=sharing')
    },
    {
      title: 'Grade 8 Mathematics - Student Textbook',
      grade: 8,
      contentType: 'textbook',
      isPremium: true,
      accessType: 'paid',
      priceEtb: 200,
      subject: 'Mathematics',
      status: 'approved',
      moderationStatus: 'approved',
      description: 'Premium Mathematics textbook for Grade 8 students. Requires payment to access.',
      pdfUrl: getPreviewUrl('https://drive.google.com/file/d/1kdQ0yuTaTkyfeG6sY4XgGgK0mHCUnasv/view?usp=drive_link')
    }
  ];

  for (const book of textbooks) {
    const payload = {
      ...book,
      uploadedBy: uploader._id
    };
    const existing = await Content.findOne({ title: book.title, grade: book.grade }).select('_id');
    if (existing) {
      await Content.updateOne({ _id: existing._id }, { $set: payload });
      console.log(`✅ Updated: ${book.title} (${book.isPremium ? 'Premium' : 'Free'})`);
    } else {
      await Content.create(payload);
      console.log(`✅ Created: ${book.title} (${book.isPremium ? 'Premium' : 'Free'})`);
    }
  }

  const freeCount = await Content.countDocuments({ isPremium: false, contentType: 'textbook' });
  const premiumCount = await Content.countDocuments({ isPremium: true, contentType: 'textbook' });
  console.log(`\n📚 Summary: Free: ${freeCount}, Premium: ${premiumCount}, Total: ${freeCount + premiumCount}`);

  await mongoose.disconnect();
  console.log('\n✅ Seeding completed!');
}

seedTextbooks().catch(async (err) => {
  console.error('❌ Seed error:', err);
  await mongoose.disconnect();
  process.exit(1);
});

