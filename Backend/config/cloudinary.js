const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const getFolderForField = (fieldName) => {
  if (fieldName === "image" || fieldName === "coverImage") {
    return "gyms/cover";
  }

  if (fieldName === "profileImage") {
    return "gyms/profile";
  }

  if (fieldName === "gallery") {
    return "gyms/gallery";
  }

  return "gym_images";
};

const createCloudinaryStorage = () =>
  new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: getFolderForField(file.fieldname),
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      resource_type: "image",
      transformation: [{ width: 1600, height: 1600, crop: "limit" }],
    }),
  });

const imageFileFilter = (req, file, cb) => {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  }

  return cb(null, true);
};

const createUploader = (fields) =>
  multer({
    storage: createCloudinaryStorage(),
    fileFilter: imageFileFilter,
    limits: {
      fileSize: Number(process.env.GYM_MEDIA_MAX_FILE_SIZE_BYTES || 5 * 1024 * 1024),
      files: 12,
    },
  }).fields(fields);

const upload = createUploader([
  { name: "coverImage", maxCount: 1 },
  { name: "image", maxCount: 1 },
  { name: "profileImage", maxCount: 1 },
  { name: "gallery", maxCount: 10 },
]);

const gymProfileMediaUpload = createUploader([
  { name: "image", maxCount: 1 },
  { name: "profileImage", maxCount: 1 },
  { name: "gallery", maxCount: 10 },
]);

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  cloudinary,
  gymProfileMediaUpload,
  upload,
};
