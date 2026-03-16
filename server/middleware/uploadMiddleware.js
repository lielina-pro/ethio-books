const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage configuration: uploads go directly to Cloudinary
const docsStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ethio-books-docs',
    resource_type: 'auto' // allow images, PDFs, etc.
  }
});

const uploadDocsToCloudinary = multer({
  storage: docsStorage
});

// Multer middleware to parse incoming "docs" files
const uploadTutorDocs = uploadDocsToCloudinary.array('docs', 10);

// After multer runs, collect the Cloudinary URLs and attach to req
const collectDocsUrls = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    req.docsUrls = [];
    return next();
  }

  // With multer-storage-cloudinary, file.path is the hosted URL
  req.docsUrls = req.files.map((file) => file.path);
  return next();
};

module.exports = {
  uploadTutorDocs,
  collectDocsUrls
};

