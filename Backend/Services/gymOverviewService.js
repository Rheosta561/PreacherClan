const mongoose = require("mongoose");
const Gym = require("../Models/GymSchema");
const User = require("../Models/User");
const EntryLog = require("../Models/EntryLog");
const Maintenance = require("../Models/Maintenance");
const Grievance = require("../Models/Grievance");
const { AppError } = require("./gymAuthService");
const { listGymRevenueEvents } = require("./membershipRevenueService");

const OVERVIEW_REVENUE_FILTERS = ["monthly", "quarterly", "yearly"];
const MEMBERSHIP_STATUS_ACTIVE = "Active";
const APP_TIME_ZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";
const APP_TIME_OFFSET = process.env.APP_TIME_OFFSET || "+05:30";
const EXPIRING_SOON_DAYS = Number(process.env.OVERVIEW_EXPIRING_SOON_DAYS || 7);
const UNRESOLVED_GRIEVANCE_HOURS = Number(process.env.OVERVIEW_UNRESOLVED_GRIEVANCE_HOURS || 48);
const RENEWAL_DROP_PERCENT_THRESHOLD = Number(process.env.OVERVIEW_RENEWAL_DROP_PERCENT_THRESHOLD || 20);
const CONGESTION_HOURLY_THRESHOLD = Number(process.env.OVERVIEW_CONGESTION_HOURLY_THRESHOLD || 20);
const CURRENCY_CODE = process.env.OVERVIEW_CURRENCY_CODE || "INR";
const CURRENCY_LOCALE = process.env.OVERVIEW_CURRENCY_LOCALE || "en-IN";

const MEMBERSHIP_PRICE_FIELD = {
  Monthly: "monthly",
  Quarterly: "quarterly",
  HalfYearly: "halfYearly",
  Yearly: "yearly",
};

const startOfDay = (dateString) => new Date(`${dateString}T00:00:00${APP_TIME_OFFSET}`);
const endOfDay = (dateString) => new Date(`${dateString}T23:59:59.999${APP_TIME_OFFSET}`);

const getMonthRange = (year, monthIndex) => ({
  start: new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0)),
  end: new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0)),
});

const getYearRange = (year) => ({
  start: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
  end: new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0)),
});

const getQuarterRange = (year, quarterIndex) => ({
  start: new Date(Date.UTC(year, quarterIndex * 3, 1, 0, 0, 0, 0)),
  end: new Date(Date.UTC(year, quarterIndex * 3 + 3, 1, 0, 0, 0, 0)),
});

const formatCurrency = (value) =>
  new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY_CODE,
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatPercentTrend = (currentValue, previousValue, label) => {
  if (!previousValue && !currentValue) {
    return `0% vs ${label}`;
  }

  if (!previousValue) {
    return `+100% vs ${label}`;
  }

  const percent = ((currentValue - previousValue) / previousValue) * 100;
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}% vs ${label}`;
};

const createObjectId = (value) => new mongoose.Types.ObjectId(value);

const getGymOrThrow = async (gymId) => {
  const gym = await Gym.findById(gymId).select("_id name membership");
  if (!gym) {
    throw new AppError("Gym not found", 404);
  }

  return gym;
};

const getMembershipAmount = (gymMembershipPricing, membershipType) => {
  const field = MEMBERSHIP_PRICE_FIELD[membershipType];
  if (!field) {
    return 0;
  }

  return Number(gymMembershipPricing?.[field] || 0);
};

const buildMembershipEventKey = (userId, membership) => [
  String(userId),
  String(membership.gymId),
  membership.membershipType || "",
  membership.membershipStartsAt ? new Date(membership.membershipStartsAt).toISOString() : "",
  membership.joinedAt ? new Date(membership.joinedAt).toISOString() : "",
].join(":");

const isRenewalMembership = (membership) => {
  if (!membership.joinedAt || !membership.membershipStartsAt) {
    return false;
  }

  return new Date(membership.membershipStartsAt).getTime() > new Date(membership.joinedAt).getTime();
};

const collectMembershipRevenueEvents = async (gym) => {
  const users = await User.find({
    $or: [
      { "gymMembership.gymId": gym._id },
      { "gymMembershipHistory.gymId": gym._id },
    ],
  })
    .select("gymMembership gymMembershipHistory")
    .lean();

  const seen = new Set();
  const events = [];

  for (const user of users) {
    const memberships = [];

    if (user.gymMembership?.gymId && String(user.gymMembership.gymId) === String(gym._id)) {
      memberships.push(user.gymMembership);
    }

    for (const historyItem of user.gymMembershipHistory || []) {
      if (historyItem?.gymId && String(historyItem.gymId) === String(gym._id)) {
        memberships.push(historyItem);
      }
    }

    for (const membership of memberships) {
      if (!membership.membershipType || !membership.membershipStartsAt) {
        continue;
      }

      const amount = getMembershipAmount(gym.membership, membership.membershipType);
      if (amount <= 0) {
        continue;
      }

      const key = buildMembershipEventKey(user._id, membership);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      events.push({
        userId: user._id,
        occurredAt: new Date(membership.membershipStartsAt),
        membershipType: membership.membershipType,
        amount,
        isRenewal: isRenewalMembership(membership),
      });
    }
  }

  return events.sort((a, b) => a.occurredAt - b.occurredAt);
};

const getRevenueEventsForGym = async (gym) => {
  const recordedEvents = await listGymRevenueEvents(gym._id);
  if (recordedEvents.length > 0) {
    return recordedEvents.map((event) => ({
      userId: event.memberUserId,
      occurredAt: new Date(event.occurredAt),
      membershipType: event.membershipType,
      amount: Number(event.amount || 0),
      isRenewal: ["renewal", "upgrade", "plan_change"].includes(event.eventType),
      eventType: event.eventType,
    }));
  }

  return collectMembershipRevenueEvents(gym);
};

const sumRevenueEvents = (events, start, end) => {
  const breakdown = {
    memberships: 0,
    renewals: 0,
    affiliates: 0,
  };

  for (const event of events) {
    if (event.occurredAt >= start && event.occurredAt < end) {
      if (event.isRenewal) {
        breakdown.renewals += event.amount;
      } else {
        breakdown.memberships += event.amount;
      }
    }
  }

  return {
    breakdown,
    overall: breakdown.memberships + breakdown.renewals + breakdown.affiliates,
  };
};

const countRenewalEvents = (events, start, end) =>
  events.filter(
    (event) => event.isRenewal && event.occurredAt >= start && event.occurredAt < end
  ).length;

const buildStatsCard = (value, previousValue, label, includeFormatted = true) => {
  const card = {
    value,
    trend: formatPercentTrend(value, previousValue, label),
  };

  if (includeFormatted) {
    card.formatted = formatCurrency(value);
  }

  return card;
};

const getCurrentPeriodRanges = () => {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const currentQuarter = Math.floor(currentMonth / 3);

  return {
    now,
    currentMonth: getMonthRange(currentYear, currentMonth),
    previousMonth: getMonthRange(
      currentMonth === 0 ? currentYear - 1 : currentYear,
      currentMonth === 0 ? 11 : currentMonth - 1
    ),
    currentYear: getYearRange(currentYear),
    previousYear: getYearRange(currentYear - 1),
    currentQuarter: getQuarterRange(currentYear, currentQuarter),
  };
};

const getStats = async (gymId) => {
  const gym = await getGymOrThrow(gymId);
  const now = new Date();
  const expiringThreshold = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);
  const ranges = getCurrentPeriodRanges();
  const currentGymFilter = { "gym.id": createObjectId(gymId) };
  const activeStatusFilter = {
    $or: [
      { "gymMembership.membershipStatus": MEMBERSHIP_STATUS_ACTIVE },
      { "gymMembership.membershipStatus": { $exists: false } },
    ],
  };

  const [
    activeMembers,
    activeMembersPreviousMonth,
    expiringSoon,
    previousExpiringSoon,
    expiredMemberships,
    previousExpiredMemberships,
    events,
  ] = await Promise.all([
    User.countDocuments({
      $and: [
        currentGymFilter,
        activeStatusFilter,
        {
          $or: [
            { "gymMembership.membershipEndsAt": { $exists: false } },
            { "gymMembership.membershipEndsAt": null },
            { "gymMembership.membershipEndsAt": { $gte: now } },
          ],
        },
      ],
    }),
    User.countDocuments({
      $and: [
        currentGymFilter,
        activeStatusFilter,
        {
          $or: [
            { "gymMembership.membershipStartsAt": { $exists: false } },
            { "gymMembership.membershipStartsAt": { $lt: ranges.currentMonth.start } },
          ],
        },
        {
          $or: [
            { "gymMembership.membershipEndsAt": { $exists: false } },
            { "gymMembership.membershipEndsAt": null },
            { "gymMembership.membershipEndsAt": { $gte: ranges.currentMonth.start } },
          ],
        },
      ],
    }),
    User.countDocuments({
      $and: [
        currentGymFilter,
        activeStatusFilter,
        {
          "gymMembership.membershipEndsAt": {
            $gte: now,
            $lte: expiringThreshold,
          },
        },
      ],
    }),
    User.countDocuments({
      $and: [
        currentGymFilter,
        activeStatusFilter,
        {
          "gymMembership.membershipEndsAt": {
            $gte: new Date(ranges.previousMonth.end.getTime() - EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000),
            $lt: ranges.previousMonth.end,
          },
        },
      ],
    }),
    User.countDocuments({
      ...currentGymFilter,
      $or: [
        { "gymMembership.membershipStatus": "Expired" },
        { "gymMembership.membershipEndsAt": { $lt: now } },
      ],
    }),
    User.countDocuments({
      ...currentGymFilter,
      $or: [
        { "gymMembership.membershipStatus": "Expired" },
        {
          "gymMembership.membershipEndsAt": {
            $gte: ranges.previousMonth.start,
            $lt: ranges.currentMonth.start,
          },
        },
      ],
    }),
    getRevenueEventsForGym(gym),
  ]);

  const currentYearRevenue = sumRevenueEvents(events, ranges.currentYear.start, ranges.currentYear.end);
  const previousYearRevenue = sumRevenueEvents(events, ranges.previousYear.start, ranges.previousYear.end);
  const currentMonthRevenue = sumRevenueEvents(events, ranges.currentMonth.start, ranges.currentMonth.end);
  const previousMonthRevenue = sumRevenueEvents(events, ranges.previousMonth.start, ranges.previousMonth.end);

  return {
    earningsThisYear: buildStatsCard(currentYearRevenue.overall, previousYearRevenue.overall, "last year"),
    monthlyEarnings: buildStatsCard(currentMonthRevenue.overall, previousMonthRevenue.overall, "last month"),
    activeMembers: {
      value: activeMembers,
      trend: formatPercentTrend(activeMembers, activeMembersPreviousMonth, "last month"),
    },
    expiringSoon: {
      value: expiringSoon,
      trend: formatPercentTrend(expiringSoon, previousExpiringSoon, "previous window"),
    },
    expiredMemberships: {
      value: expiredMemberships,
      trend: formatPercentTrend(expiredMemberships, previousExpiredMemberships, "last month"),
    },
    breakdown: {
      memberships: currentYearRevenue.breakdown.memberships,
      renewals: currentYearRevenue.breakdown.renewals,
      affiliates: 0,
    },
  };
};

const generateMonthlyPoints = (events, range) => {
  const year = range.start.getUTCFullYear();
  const month = range.start.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const buckets = Array.from({ length: daysInMonth }, (_, index) => ({
    label: String(index + 1).padStart(2, "0"),
    value: 0,
  }));

  for (const event of events) {
    if (event.occurredAt >= range.start && event.occurredAt < range.end) {
      const dayIndex = event.occurredAt.getUTCDate() - 1;
      if (buckets[dayIndex]) {
        buckets[dayIndex].value += event.amount;
      }
    }
  }

  return buckets;
};

const generateQuarterlyPoints = (events, range) => {
  const buckets = Array.from({ length: 3 }, (_, index) => {
    const date = new Date(Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth() + index, 1));
    return {
      label: new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        month: "short",
      }).format(date),
      value: 0,
    };
  });

  for (const event of events) {
    if (event.occurredAt >= range.start && event.occurredAt < range.end) {
      const monthOffset =
        event.occurredAt.getUTCMonth() - range.start.getUTCMonth() +
        (event.occurredAt.getUTCFullYear() - range.start.getUTCFullYear()) * 12;
      if (buckets[monthOffset]) {
        buckets[monthOffset].value += event.amount;
      }
    }
  }

  return buckets;
};

const generateYearlyPoints = (events, range) => {
  const buckets = Array.from({ length: 12 }, (_, index) => ({
    label: new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "short",
    }).format(new Date(Date.UTC(range.start.getUTCFullYear(), index, 1))),
    value: 0,
  }));

  for (const event of events) {
    if (event.occurredAt >= range.start && event.occurredAt < range.end) {
      const monthIndex = event.occurredAt.getUTCMonth();
      buckets[monthIndex].value += event.amount;
    }
  }

  return buckets;
};

const getRevenue = async (gymId, filter = "monthly") => {
  const safeFilter = OVERVIEW_REVENUE_FILTERS.includes(filter) ? filter : "monthly";
  const gym = await getGymOrThrow(gymId);
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const currentQuarter = Math.floor(currentMonth / 3);
  const events = await getRevenueEventsForGym(gym);

  let range;
  let points;

  if (safeFilter === "quarterly") {
    range = getQuarterRange(currentYear, currentQuarter);
    points = generateQuarterlyPoints(events, range);
  } else if (safeFilter === "yearly") {
    range = getYearRange(currentYear);
    points = generateYearlyPoints(events, range);
  } else {
    range = getMonthRange(currentYear, currentMonth);
    points = generateMonthlyPoints(events, range);
  }

  const totals = sumRevenueEvents(events, range.start, range.end);

  return {
    filter: safeFilter,
    points,
    totals: {
      memberships: totals.breakdown.memberships,
      renewals: totals.breakdown.renewals,
      affiliates: 0,
      overall: totals.overall,
    },
  };
};

const getRenewalInsight = async (gym) => {
  const events = await getRevenueEventsForGym(gym);
  const now = new Date();
  const recentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const recentRenewals = countRenewalEvents(events, recentStart, now);
  const previousRenewals = countRenewalEvents(events, previousStart, recentStart);
  const dropPercent = previousRenewals
    ? ((previousRenewals - recentRenewals) / previousRenewals) * 100
    : 0;
  const isDropping = previousRenewals > 0 && dropPercent >= RENEWAL_DROP_PERCENT_THRESHOLD;

  return {
    key: "renewals_dropping",
    title: "Membership renewals are dropping",
    description: isDropping
      ? `Renewals fell to ${recentRenewals} in the last 14 days from ${previousRenewals} in the previous 14 days.`
      : `Renewals are stable with ${recentRenewals} in the last 14 days.`,
    severity: isDropping ? "warning" : "info",
    actionText: "View Members",
    route: "/dashboard/members",
    count: Math.max(previousRenewals - recentRenewals, 0),
  };
};

const getMaintenanceInsight = async (gymId) => {
  const count = await Maintenance.countDocuments({
    gymId,
    category: "Equipment",
    status: { $in: ["Scheduled", "In Progress"] },
  });

  return {
    key: "maintenance_required",
    title: "Treadmill maintenance required",
    description:
      count > 0
        ? `${count} equipment maintenance task${count === 1 ? "" : "s"} need attention.`
        : "No pending equipment maintenance tasks need immediate action.",
    severity: count > 0 ? "critical" : "info",
    actionText: "Schedule Maintenance",
    route: "/dashboard/maintenance",
    count,
  };
};

const getPendingGrievancesInsight = async (gymId) => {
  const thresholdDate = new Date(Date.now() - UNRESOLVED_GRIEVANCE_HOURS * 60 * 60 * 1000);
  const count = await Grievance.countDocuments({
    gymId,
    status: { $in: ["Open", "In Review"] },
    createdAt: { $lte: thresholdDate },
  });

  return {
    key: "pending_grievances",
    title: "Pending member grievances",
    description:
      count > 0
        ? `${count} unresolved grievance${count === 1 ? "" : "s"} have been pending beyond the review threshold.`
        : "No unresolved grievances have crossed the reminder threshold.",
    severity: count > 0 ? "critical" : "info",
    actionText: "Resolve Now",
    route: "/dashboard/preacherclan/grievances",
    count,
  };
};

const getPeakHourInsight = async (gymId) => {
  const lastSevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const points = await EntryLog.aggregate([
    {
      $match: {
        gymId: createObjectId(gymId),
        actionType: "check_in",
        occurredAt: { $gte: lastSevenDays },
      },
    },
    {
      $group: {
        _id: {
          hour: {
            $hour: {
              date: "$occurredAt",
              timezone: APP_TIME_ZONE,
            },
          },
        },
        entries: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.hour": 1 },
    },
  ]);

  const peak = points.reduce(
    (best, point) => (point.entries > best.entries ? point : best),
    { _id: { hour: null }, entries: 0 }
  );
  const hourLabel =
    peak._id.hour == null
      ? null
      : `${String(peak._id.hour).padStart(2, "0")}:00-${String((peak._id.hour + 1) % 24).padStart(2, "0")}:00`;
  const isCongested = peak.entries >= CONGESTION_HOURLY_THRESHOLD;

  return {
    key: "peak_hour_congestion",
    title: "Peak hour congestion",
    description: hourLabel
      ? `Peak check-ins are around ${hourLabel} with ${peak.entries} entries in the last 7 days.`
      : "Not enough entry data is available yet to detect congestion.",
    severity: isCongested ? "warning" : "info",
    actionText: null,
    route: null,
    count: peak.entries || 0,
  };
};

const getInsights = async (gymId) => {
  const gym = await getGymOrThrow(gymId);

  const [renewalInsight, maintenanceInsight, grievancesInsight, peakHourInsight] =
    await Promise.all([
      getRenewalInsight(gym),
      getMaintenanceInsight(gymId),
      getPendingGrievancesInsight(gymId),
      getPeakHourInsight(gymId),
    ]);

  return [renewalInsight, maintenanceInsight, grievancesInsight, peakHourInsight];
};

const getOverview = async (gymId, revenueFilter = "monthly") => {
  const [stats, revenue, insights] = await Promise.all([
    getStats(gymId),
    getRevenue(gymId, revenueFilter),
    getInsights(gymId),
  ]);

  return {
    stats,
    revenue,
    insights,
  };
};

module.exports = {
  OVERVIEW_REVENUE_FILTERS,
  collectMembershipRevenueEvents,
  getInsights,
  getOverview,
  getRevenue,
  getStats,
  startOfDay,
  endOfDay,
};
