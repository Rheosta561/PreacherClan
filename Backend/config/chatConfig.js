// utils/chatUpload.js
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Chatstorage config
const chatMediaStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: 'chat_media',
        resource_type: 'auto', // auto detects image/video/etc
        public_id: `${Date.now()}-${file.originalname}`,
        allowed_formats: ['jpg', 'jpeg', 'png', 'mp4', 'gif', 'webp', 'pdf', 'docx']
    }),
});


const chatMediaUpload = multer({ storage: chatMediaStorage });

module.exports = { chatMediaUpload };
