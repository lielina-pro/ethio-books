const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary using environment variables
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

// Log a masked snapshot of the Cloudinary configuration and validate presence
console.log('Initializing Cloudinary storage with env:', {
  cloudName: CLOUDINARY_CLOUD_NAME || 'undefined',
  apiKeyPrefix: CLOUDINARY_API_KEY ? CLOUDINARY_API_KEY.slice(0, 4) + '***' : 'undefined',
  hasSecret: !!CLOUDINARY_API_SECRET
});

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('Cloudinary environment variables are missing or incomplete.');
}

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
const uploadContentFile = uploadDocsToCloudinary.single('file');
const uploadPaymentScreenshot = uploadDocsToCloudinary.single('screenshot');

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
  collectDocsUrls,
  uploadContentFile,
  uploadPaymentScreenshot
};

