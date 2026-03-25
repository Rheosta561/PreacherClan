const multer = require("multer");
const { validationResult } = require("express-validator");
const { AppError } = require("../Services/gymAuthService");
const {
  getGymProfile,
  removeGymGalleryImage,
  updateGymProfile,
  updateGymProfileMedia,
} = require("../Services/gymProfileService");

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const ensureValid = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError("Validation failed", 422, errors.array());
  }
};

const getProfile = asyncHandler(async (req, res) => {
  const result = await getGymProfile(req.gym.id);
  return res.status(200).json(result);
});

const updateProfile = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await updateGymProfile(req.gym.id, req.body);

  return res.status(200).json({
    message: "Gym profile updated successfully",
    ...result,
  });
});

const updateProfileMedia = asyncHandler(async (req, res) => {
  const result = await updateGymProfileMedia(req.gym.id, req.files, req.body);

  return res.status(200).json({
    message: "Gym media updated successfully",
    ...result,
  });
});

const deleteGalleryImage = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await removeGymGalleryImage(req.gym.id, req.body.imageUrl);

  return res.status(200).json({
    message: "Gallery image removed successfully",
    ...result,
  });
});

const mediaUploadErrorHandler = (error, req, res, next) => {
  if (!(error instanceof multer.MulterError)) {
    return next(error);
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(422).json({
      message: "Uploaded image exceeds the allowed file size",
    });
  }

  return res.status(422).json({
    message: "Invalid media upload request",
    error: error.message,
  });
};

module.exports = {
  deleteGalleryImage,
  getProfile,
  mediaUploadErrorHandler,
  updateProfile,
  updateProfileMedia,
};
