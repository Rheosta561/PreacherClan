const user = require("../Models/User");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const getScoreHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const requestedYear = req.query.year ? Number(req.query.year) : undefined;
    if (requestedYear !== undefined && (!Number.isInteger(requestedYear) || requestedYear < 2000 || requestedYear > 3000)) {
      return res.status(400).json({ message: "Invalid year" });
    }

    const currentUser = await user.findById(userId).select("monthlyHistory lastMonthlyReset preacherScore streak").lean();
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const history = currentUser.monthlyHistory || [];
    const lastReset = currentUser.lastMonthlyReset ? new Date(currentUser.lastMonthlyReset) : null;
    const allRows = history.map((entry, index) => {
      let year = entry.year;
      let monthNumber = entry.monthNumber;
      let month = entry.month;
      if (!year || !monthNumber) {
        if (lastReset) {
          const anchorMonth = lastReset.getMonth() - 1;
          const anchorDate = new Date(lastReset.getFullYear(), anchorMonth, 1);
          const monthsBackFromLatest = history.length - 1 - index;
          const inferred = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - monthsBackFromLatest, 1);
          year = inferred.getFullYear();
          monthNumber = inferred.getMonth() + 1;
          month = MONTHS[monthNumber - 1];
        } else if (MONTHS.includes(entry.month)) {
          const monthIndex = MONTHS.indexOf(entry.month);
          monthNumber = monthIndex + 1;
        }
      }
      return {
        month: month || MONTHS[(monthNumber || 1) - 1],
        monthNumber,
        year,
        preacherScore: entry.preacherScore || 0,
        streak: entry.streak || 0,
      };
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNumber = now.getMonth() + 1;
    const currentMonthRecorded = allRows.some((entry) => entry.year === currentYear && entry.monthNumber === currentMonthNumber);
    if (!currentMonthRecorded && ((currentUser.preacherScore || 0) > 0 || history.length > 0)) {
      allRows.push({
        month: MONTHS[currentMonthNumber - 1],
        monthNumber: currentMonthNumber,
        year: currentYear,
        preacherScore: currentUser.preacherScore || 0,
        streak: currentUser.streak?.count || 0,
        isCurrentMonth: true,
      });
    }
    allRows.sort((a, b) => (b.year || 0) - (a.year || 0) || (b.monthNumber || 0) - (a.monthNumber || 0));

    const years = [...new Set(allRows.map((entry) => entry.year).filter(Boolean))].sort((a, b) => b - a);
    const rows = allRows.filter((entry) => !requestedYear || entry.year === requestedYear);
    return res.status(200).json({ history: rows, years });
  } catch (error) {
    console.error("Error fetching preacher score history:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getGlobalLeaderboard = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const topUsers = await user
      .find({})
      .sort({ preacherScore: -1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .populate("profile", "profileImage fitnessGoals")
      .populate("gym", "name")
      .lean();

    const count = await user.countDocuments({});

    const leaderboard = topUsers.map((u) => ({
      userId: u._id,
      name: u.name,
      preacherScore: u.preacherScore || 0,
      profileImage: u.profile?.profileImage || null,
      gymName: u.gym?.name || null,
      fitnessGoals: u.profile?.fitnessGoals || [],
      isVerified: u.isVerified || false,
    }));

    return res.status(200).json({
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      totalUsers: count,
      leaderboard,
    });
  } catch (error) {
    console.error("Error fetching global leaderboard:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const getUserRank = async (req, res) => {
  try {
    const { userId } = req.params;

    const currentUser = await user.findById(userId).select("preacherScore");
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const score = currentUser.preacherScore || 0;
    
    // Calculate global rank:
    // 1. Users with a strictly greater score
    const higherScoreCount = await user.countDocuments({ preacherScore: { $gt: score } });
    
    // 2. Tie-breaker: users with the exact same score but joined earlier (smaller _id)
    const tieBreakerCount = await user.countDocuments({ 
      preacherScore: score, 
      _id: { $lt: currentUser._id } 
    });

    const rank = higherScoreCount + tieBreakerCount + 1;

    return res.status(200).json({
      userId,
      preacherScore: score,
      rank,
    });
  } catch (error) {
    console.error("Error fetching user rank:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

module.exports = {
  getGlobalLeaderboard,
  getUserRank,
  getScoreHistory,
};
