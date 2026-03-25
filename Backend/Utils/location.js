const EARTH_RADIUS_METERS = 6371000;

const isValidCoordinate = (value) => Number.isFinite(Number(value));

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const getDistanceMeters = (latitude1, longitude1, latitude2, longitude2) => {
  if (
    !isValidCoordinate(latitude1) ||
    !isValidCoordinate(longitude1) ||
    !isValidCoordinate(latitude2) ||
    !isValidCoordinate(longitude2)
  ) {
    return null;
  }

  const lat1 = Number(latitude1);
  const lon1 = Number(longitude1);
  const lat2 = Number(latitude2);
  const lon2 = Number(longitude2);

  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lon2 - lon1);
  const latitude1Radians = toRadians(lat1);
  const latitude2Radians = toRadians(lat2);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1Radians) *
      Math.cos(latitude2Radians) *
      Math.sin(longitudeDelta / 2) ** 2;

  const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return EARTH_RADIUS_METERS * angularDistance;
};

module.exports = {
  getDistanceMeters,
  isValidCoordinate,
};
