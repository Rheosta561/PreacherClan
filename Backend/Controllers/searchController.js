const User = require('../Models/User');
const Gym = require('../Models/GymSchema');

// distance util
const toRad = (v) => (v * Math.PI) / 180;

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// unified search controller 
exports.search = async (req, res) => {
  try {
    let {
      q,
      type = 'all',
      userId,
      latitude,
      longitude,
      radius,
      city,
      state,
      country
    } = req.query;

    if (!q || q.trim() === '') {
      return res.status(200).json({
        users: [],
        gyms: [],
        recommendedGyms: []
      });
    }

    const regex = new RegExp(q, 'i');

    latitude = latitude ? parseFloat(latitude) : null;
    longitude = longitude ? parseFloat(longitude) : null;
    radius = radius ? parseFloat(radius) : null;

    let users = [];
    let gyms = [];
    let recommendedGyms = [];

// users
    if (type === 'users' || type === 'all') {
      users = await User.find({
        $or: [
          { username: regex },
          { name: regex }
        ]
      })
        .select('name profile username image preacherScore streak gym')
        .populate('profile')
        .limit(8);

        console.log('users for search ', users);

// location based filtering
      if (latitude || city || state || country) {
        users = users.filter((u) => {
          const addr = u.profile?.address;
          if (!addr) return false;

          if (city && !new RegExp(city, 'i').test(addr.city)) return false;
          if (state && !new RegExp(state, 'i').test(addr.state)) return false;
          if (country && !new RegExp(country, 'i').test(addr.country)) return false;

          if (latitude && longitude) {
            const dist = getDistanceKm(
              latitude,
              longitude,
              addr.lattitude,
              addr.longitude
            );

            if (radius && dist !== null && dist > radius) return false;
            u.distanceKm = dist;
          }

          return true;
        });
      }
    }

// gyms
    if (type === 'gyms' || type === 'all') {
      gyms = await Gym.find({
        $or: [
          { name: regex },
          { location: regex },
          { facilities: { $in: [regex] } },
          { equipment: { $in: [regex] } }
        ]
      })
        .select('_id name location image profileImage rating facilities equipment')
        .sort({ rating: -1 })
        .limit(8);

// location + radius 
      if (latitude || city || state || country) {
        gyms = gyms
          .map((g) => {
            if (latitude && longitude && g.address) {
              g.distanceKm = getDistanceKm(
                latitude,
                longitude,
                g.address.lattitude,
                g.address.longitude
              );
            }
            return g;
          })
          .filter((g) => {
            if (city && !new RegExp(city, 'i').test(g.location)) return false;
            if (radius && g.distanceKm !== null && g.distanceKm > radius) return false;
            return true;
          })
          .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      }
    }

// fallback
    if (gyms.length === 0) {
      gyms = await Gym.find().sort({ rating: -1 }).limit(2);
    }

// recommmendations
    if (userId) {
      const user = await User.findById(userId).populate('gym');

      if (user) {
        const userGym = user.gym;

        const recommendQuery = userGym
          ? {
              _id: { $ne: userGym._id },
              $or: [
                { facilities: { $in: userGym.facilities } },
                { equipment: { $in: userGym.equipment } },
                { rating: { $gte: 4 } }
              ]
            }
          : { rating: { $gte: 4 } };

        recommendedGyms = await Gym.find(recommendQuery)
          .select('name location image profileImage rating')
          .sort({ rating: -1 })
          .limit(5);
      }
    }

    return res.status(200).json({
      query: q,
      type,
      users,
      gyms,
      recommendedGyms
    });

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ message: 'Search failed' });
  }
};
exports.searchFriends = async (req, res) => {
  try {
    const { userId, q } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }

    if (!q || !q.trim()) {
      return res.status(200).json([]);
    }

    const regex = new RegExp(q, "i");

    // Get user + partner list
    const me = await User.findById(userId).select("partner");

    if (!me || !me.partner?.length) {
      return res.status(200).json([]);
    }

    // 2Find partners matching query
    const partners = await User.find({
      _id: { $in: me.partner },
      $or: [{ username: regex }, { name: regex }]
    })
      .select("name profile username image")
      .populate("profile", "profileImage") // prfile image
      .limit(10);

    // mapping response
    const results = partners.map(u => ({
      userId: u._id,
      name: u.name ?? u.username,
      profileImage:
        u.profile?.profileImage ??
        u.image ??
        "https://i.pravatar.cc/150"
    }));

    return res.status(200).json(results);
  } catch (err) {
    console.error("searchFriends error:", err);
    return res.status(500).json({ message: "Failed to search friends" });
  }
};