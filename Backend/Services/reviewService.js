const Review = require("../Models/Review");
const Gym = require("../Models/GymSchema");
const User = require("../Models/User");
const { AppError } = require("./gymAuthService");

const parsePagination = ({ page = 1, limit = 10 }) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const REVIEW_SORT_FIELDS = ["createdAt", "updatedAt", "rating"];

const formatReviewDto = (review) => ({
  id: review._id,
  userId: review.userId?._id || review.userId,
  userName: review.userId?.name || null,
  userUsername: review.userId?.username || null,
  userImage: review.userId?.image || null,
  gymId: review.gymId?._id || review.gymId,
  rating: review.rating,
  comment: review.comment,
  images: review.images || [],
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

const getGymOrThrow = async (gymId) => {
  const gym = await Gym.findById(gymId).select("_id members reviews");
  if (!gym) {
    throw new AppError("Gym not found", 404);
  }

  return gym;
};

const recalculateGymReviewStats = async (gymId) => {
  const [stats, reviewRefs] = await Promise.all([
    Review.aggregate([
      { $match: { gymId } },
      {
        $group: {
          _id: "$gymId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]),
    Review.find({ gymId }).select("_id").lean(),
  ]);

  const averageRating = stats[0]?.averageRating ? Number(stats[0].averageRating.toFixed(2)) : 0;
  const totalReviews = stats[0]?.totalReviews || 0;

  await Gym.findByIdAndUpdate(gymId, {
    rating: averageRating,
    reviewCount: totalReviews,
    reviews: reviewRefs.map((item) => item._id),
  });

  return {
    averageRating,
    totalReviews,
  };
};

const ensureUserCanReviewGym = async (userId, gymId) => {
  const gym = await getGymOrThrow(gymId);
  const user = await User.findById(userId).select("_id gym name username image");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const isGymMember = gym.members.some((id) => id.toString() === String(userId));
  const userBelongsToGym = String(user.gym?.id || "") === String(gymId);
  if (!isGymMember || !userBelongsToGym) {
    throw new AppError("Only gym members can review this gym", 403);
  }

  return { gym, user };
};

const createReview = async (userId, payload) => {
  const { gym, user } = await ensureUserCanReviewGym(userId, payload.gymId);

  const existingReview = await Review.findOne({ userId, gymId: gym._id });
  if (existingReview) {
    throw new AppError("You have already reviewed this gym", 409);
  }

  const review = await Review.create({
    userId,
    gymId: gym._id,
    rating: payload.rating,
    comment: payload.comment,
    images: payload.images || [],
  });

  const summary = await recalculateGymReviewStats(gym._id);
  const populatedReview = await Review.findById(review._id)
    .populate("userId", "name username image")
    .populate("gymId", "_id");

  return {
    item: formatReviewDto(populatedReview),
    summary,
  };
};

const listReviewsForGym = async (gymId, query, includeSummary = true) => {
  await getGymOrThrow(gymId);
  const { page, limit, skip } = parsePagination(query);
  const sortBy = REVIEW_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;

  const [items, totalItems, summary] = await Promise.all([
    Review.find({ gymId })
      .populate("userId", "name username image")
      .populate("gymId", "_id")
      .sort({ [sortBy]: sortOrder, _id: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ gymId }),
    includeSummary ? recalculateGymReviewStats(gymId) : Promise.resolve(null),
  ]);

  const response = {
    items: items.map(formatReviewDto),
    page,
    limit,
    totalItems,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
  };

  if (includeSummary) {
    response.summary = summary;
  }

  return response;
};

const getReviewDetails = async (reviewId) => {
  const review = await Review.findById(reviewId)
    .populate("userId", "name username image")
    .populate("gymId", "_id");

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  return {
    item: formatReviewDto(review),
  };
};

const updateOwnReview = async (userId, reviewId, payload) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError("Review not found", 404);
  }

  if (String(review.userId) !== String(userId)) {
    throw new AppError("You can only update your own review", 403);
  }

  if (typeof payload.rating !== "undefined") {
    review.rating = payload.rating;
  }

  if (typeof payload.comment !== "undefined") {
    review.comment = payload.comment;
  }

  if (typeof payload.images !== "undefined") {
    review.images = payload.images;
  }

  await review.save();
  const summary = await recalculateGymReviewStats(review.gymId);

  const populatedReview = await Review.findById(review._id)
    .populate("userId", "name username image")
    .populate("gymId", "_id");

  return {
    item: formatReviewDto(populatedReview),
    summary,
  };
};

const deleteOwnReview = async (userId, reviewId) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError("Review not found", 404);
  }

  if (String(review.userId) !== String(userId)) {
    throw new AppError("You can only delete your own review", 403);
  }

  const gymId = review.gymId;
  await Review.deleteOne({ _id: review._id });
  const summary = await recalculateGymReviewStats(gymId);

  return { summary };
};

const listGymDashboardReviews = async (gymId, query) => {
  await getGymOrThrow(gymId);
  const { page, limit, skip } = parsePagination(query);
  const sortBy = REVIEW_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;

  const filter = { gymId };

  if (query.rating) {
    filter.rating = Number(query.rating);
  }

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search.trim()), "i");
    const matchingUsers = await User.find({
      $or: [
        { name: regex },
        { username: regex },
      ],
    }).select("_id").lean();

    filter.$or = [
      { userId: { $in: matchingUsers.map((user) => user._id) } },
      { comment: regex },
    ];
  }

  const [items, totalItems, summary] = await Promise.all([
    Review.find(filter)
      .populate("userId", "name username image")
      .populate("gymId", "_id")
      .sort({ [sortBy]: sortOrder, _id: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
    recalculateGymReviewStats(gymId),
  ]);

  return {
    items: items.map(formatReviewDto),
    page,
    limit,
    totalItems,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
    summary,
  };
};

const deleteGymReview = async (gymId, reviewId) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError("Review not found", 404);
  }

  if (String(review.gymId) !== String(gymId)) {
    throw new AppError("This review does not belong to your gym", 403);
  }

  await Review.deleteOne({ _id: review._id });
  const summary = await recalculateGymReviewStats(gymId);

  return { summary };
};

module.exports = {
  createReview,
  deleteGymReview,
  deleteOwnReview,
  getReviewDetails,
  listGymDashboardReviews,
  listReviewsForGym,
  recalculateGymReviewStats,
  updateOwnReview,
};
