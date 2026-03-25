const Gym = require("../Models/GymSchema");
const { AppError } = require("./gymAuthService");

const PROFILE_TEXT_FIELDS = [
  "name",
  "location",
  "description",
  "address",
  "contact",
  "facilities",
  "equipment",
  "membership",
];

const parseArray = (value) => {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch (error) {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  throw new AppError("Expected an array of strings", 422);
};

const parseObject = (value, fieldName) => {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return {};
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      throw new AppError(`${fieldName} must be a valid object`, 422);
    }
  }

  throw new AppError(`${fieldName} must be a valid object`, 422);
};

const toNumberOrUndefined = (value) => {
  if (typeof value === "undefined" || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new AppError("Membership values and coordinates must be valid numbers", 422);
  }

  return parsed;
};

const sanitizeEditableGym = (gym) => ({
  id: gym._id,
  name: gym.name,
  username: gym.username,
  location: gym.location,
  description: gym.description,
  image: gym.image || null,
  profileImage: gym.profileImage || null,
  gallery: Array.isArray(gym.gallery) ? gym.gallery : [],
  address: {
    country: gym.address?.country || "",
    state: gym.address?.state || "",
    city: gym.address?.city || "",
    latitude: gym.address?.latitude ?? gym.address?.lattitude ?? null,
    longitude: gym.address?.longitude ?? null,
  },
  contact: {
    email: gym.contact?.email || "",
    phone: gym.contact?.phone || "",
  },
  facilities: Array.isArray(gym.facilities) ? gym.facilities : [],
  equipment: Array.isArray(gym.equipment) ? gym.equipment : [],
  membership: {
    monthly: gym.membership?.monthly ?? 0,
    quarterly: gym.membership?.quarterly ?? 0,
    halfYearly: gym.membership?.halfYearly ?? 0,
    yearly: gym.membership?.yearly ?? 0,
  },
  updatedAt: gym.updatedAt,
  createdAt: gym.createdAt,
});

const getGymOrThrow = async (gymId) => {
  const gym = await Gym.findById(gymId);
  if (!gym) {
    throw new AppError("Gym not found", 404);
  }

  return gym;
};

const getGymProfile = async (gymId) => {
  const gym = await getGymOrThrow(gymId);
  return {
    profile: sanitizeEditableGym(gym),
  };
};

const updateNestedAddress = (gym, address) => {
  if (!address || typeof address !== "object") {
    return;
  }

  gym.address = gym.address || {};

  if (Object.prototype.hasOwnProperty.call(address, "country")) {
    gym.address.country = address.country;
  }

  if (Object.prototype.hasOwnProperty.call(address, "state")) {
    gym.address.state = address.state;
  }

  if (Object.prototype.hasOwnProperty.call(address, "city")) {
    gym.address.city = address.city;
  }

  if (Object.prototype.hasOwnProperty.call(address, "latitude")) {
    const latitude = toNumberOrUndefined(address.latitude);
    gym.address.latitude = latitude;
    gym.address.lattitude = latitude;
  }

  if (Object.prototype.hasOwnProperty.call(address, "longitude")) {
    gym.address.longitude = toNumberOrUndefined(address.longitude);
  }
};

const updateNestedContact = (gym, contact) => {
  if (!contact || typeof contact !== "object") {
    return;
  }

  gym.contact = gym.contact || {};

  if (Object.prototype.hasOwnProperty.call(contact, "email")) {
    gym.contact.email = contact.email;
  }

  if (Object.prototype.hasOwnProperty.call(contact, "phone")) {
    gym.contact.phone = contact.phone;
  }
};

const updateNestedMembership = (gym, membership) => {
  if (!membership || typeof membership !== "object") {
    return;
  }

  gym.membership = gym.membership || {};

  if (Object.prototype.hasOwnProperty.call(membership, "monthly")) {
    gym.membership.monthly = toNumberOrUndefined(membership.monthly);
  }

  if (Object.prototype.hasOwnProperty.call(membership, "quarterly")) {
    gym.membership.quarterly = toNumberOrUndefined(membership.quarterly);
  }

  if (Object.prototype.hasOwnProperty.call(membership, "halfYearly")) {
    gym.membership.halfYearly = toNumberOrUndefined(membership.halfYearly);
  }

  if (Object.prototype.hasOwnProperty.call(membership, "yearly")) {
    gym.membership.yearly = toNumberOrUndefined(membership.yearly);
  }
};

const updateGymProfile = async (gymId, payload) => {
  const gym = await getGymOrThrow(gymId);

  if (typeof payload.name !== "undefined") {
    gym.name = payload.name;
  }

  if (typeof payload.location !== "undefined") {
    gym.location = payload.location;
  }

  if (typeof payload.description !== "undefined") {
    gym.description = payload.description;
  }

  const address = parseObject(payload.address, "address");
  const contact = parseObject(payload.contact, "contact");
  const membership = parseObject(payload.membership, "membership");

  updateNestedAddress(gym, address);
  updateNestedContact(gym, contact);
  updateNestedMembership(gym, membership);

  if (typeof payload.facilities !== "undefined") {
    gym.facilities = parseArray(payload.facilities);
  }

  if (typeof payload.equipment !== "undefined") {
    gym.equipment = parseArray(payload.equipment);
  }

  await gym.save();

  return {
    profile: sanitizeEditableGym(gym),
  };
};

const extractUrls = (files) => (files || []).map((file) => file.path || file.secure_url).filter(Boolean);

const updateGymProfileMedia = async (gymId, files, body = {}) => {
  const gym = await getGymOrThrow(gymId);

  const imageUrls = extractUrls(files?.image);
  const profileImageUrls = extractUrls(files?.profileImage);
  const galleryUrls = extractUrls(files?.gallery);
  const shouldReplaceGallery = body.replaceGallery === "true";

  if (!imageUrls[0] && !profileImageUrls[0] && galleryUrls.length === 0) {
    throw new AppError("At least one image file is required", 422);
  }

  if (imageUrls[0]) {
    gym.image = imageUrls[0];
  }

  if (profileImageUrls[0]) {
    gym.profileImage = profileImageUrls[0];
  }

  if (galleryUrls.length > 0) {
    const existing = Array.isArray(gym.gallery) ? gym.gallery : [];
    gym.gallery = shouldReplaceGallery
      ? galleryUrls
      : [...new Set([...existing, ...galleryUrls])];
  }

  await gym.save();

  return {
    profile: sanitizeEditableGym(gym),
  };
};

const removeGymGalleryImage = async (gymId, imageUrl) => {
  const gym = await getGymOrThrow(gymId);
  const existingGallery = Array.isArray(gym.gallery) ? gym.gallery : [];

  if (!existingGallery.includes(imageUrl)) {
    throw new AppError("Gallery image not found for this gym", 404);
  }

  gym.gallery = existingGallery.filter((item) => item !== imageUrl);
  await gym.save();

  return {
    profile: sanitizeEditableGym(gym),
  };
};

module.exports = {
  PROFILE_TEXT_FIELDS,
  getGymProfile,
  removeGymGalleryImage,
  sanitizeEditableGym,
  updateGymProfile,
  updateGymProfileMedia,
};
