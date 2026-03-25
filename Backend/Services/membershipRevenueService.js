const GymRevenueEvent = require("../Models/GymRevenueEvent");

const PLAN_PRICE_FIELD = {
  Monthly: "monthly",
  Quarterly: "quarterly",
  HalfYearly: "halfYearly",
  Yearly: "yearly",
};

const roundCurrency = (value) => Math.round((Number(value) || 0) * 100) / 100;

const getMembershipPrice = (gym, membershipType) => {
  const priceField = PLAN_PRICE_FIELD[membershipType];
  if (!priceField) {
    return 0;
  }

  return roundCurrency(gym.membership?.[priceField] || 0);
};

const toDateOrNull = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const calculateRemainingCredit = (gym, membership, effectiveAt = new Date()) => {
  if (!membership?.membershipType) {
    return 0;
  }

  const start = toDateOrNull(membership.membershipStartsAt || membership.joinedAt);
  const end = toDateOrNull(membership.membershipEndsAt);
  if (!start || !end) {
    return 0;
  }

  const effectiveDate = toDateOrNull(effectiveAt) || new Date();
  if (effectiveDate >= end || end <= start) {
    return 0;
  }

  const totalDuration = end.getTime() - start.getTime();
  const remainingDuration = end.getTime() - effectiveDate.getTime();
  if (totalDuration <= 0 || remainingDuration <= 0) {
    return 0;
  }

  const membershipPrice = getMembershipPrice(gym, membership.membershipType);
  if (membershipPrice <= 0) {
    return 0;
  }

  return roundCurrency((membershipPrice * remainingDuration) / totalDuration);
};

const createRevenueEvent = async ({
  gym,
  userId,
  eventType,
  amount,
  occurredAt,
  membershipType,
  previousMembershipType,
  previousMembership,
  nextMembership,
  notes,
  session,
}) => {
  const finalAmount = roundCurrency(amount);
  if (finalAmount === 0) {
    return null;
  }

  return GymRevenueEvent.create(
    [
      {
        gymId: gym._id,
        memberUserId: userId,
        eventType,
        amount: finalAmount,
        occurredAt: occurredAt || new Date(),
        membershipType: membershipType || null,
        previousMembershipType: previousMembershipType || null,
        notes: notes || null,
        metadata: {
          previousMembershipStartsAt: toDateOrNull(previousMembership?.membershipStartsAt),
          previousMembershipEndsAt: toDateOrNull(previousMembership?.membershipEndsAt),
          membershipStartsAt: toDateOrNull(nextMembership?.membershipStartsAt),
          membershipEndsAt: toDateOrNull(nextMembership?.membershipEndsAt),
        },
      },
    ],
    { session }
  );
};

const maybeRecordMembershipRevenueUpdate = async ({
  gym,
  userId,
  previousMembership,
  nextMembership,
  occurredAt,
  session,
}) => {
  const previousType = previousMembership?.membershipType || null;
  const nextType = nextMembership?.membershipType || null;

  if (!nextType) {
    return null;
  }

  const previousStart = toDateOrNull(previousMembership?.membershipStartsAt || previousMembership?.joinedAt);
  const nextStart = toDateOrNull(nextMembership?.membershipStartsAt || nextMembership?.joinedAt);
  const previousPrice = getMembershipPrice(gym, previousType);
  const nextPrice = getMembershipPrice(gym, nextType);

  if (!previousType) {
    return createRevenueEvent({
      gym,
      userId,
      eventType: "new_membership",
      amount: nextPrice,
      occurredAt: nextStart || occurredAt,
      membershipType: nextType,
      previousMembershipType: null,
      previousMembership,
      nextMembership,
      notes: "Initial membership billed",
      session,
    });
  }

  if (previousType !== nextType) {
    const remainingCredit = calculateRemainingCredit(gym, previousMembership, occurredAt);
    const deltaAmount = roundCurrency(nextPrice - remainingCredit);
    const eventType = nextPrice >= previousPrice ? "upgrade" : "plan_change";

    return createRevenueEvent({
      gym,
      userId,
      eventType,
      amount: deltaAmount,
      occurredAt: occurredAt || new Date(),
      membershipType: nextType,
      previousMembershipType: previousType,
      previousMembership,
      nextMembership,
      notes: `Membership changed from ${previousType} to ${nextType}`,
      session,
    });
  }

  if (
    previousStart &&
    nextStart &&
    nextStart.getTime() > previousStart.getTime()
  ) {
    return createRevenueEvent({
      gym,
      userId,
      eventType: "renewal",
      amount: nextPrice,
      occurredAt: nextStart,
      membershipType: nextType,
      previousMembershipType: previousType,
      previousMembership,
      nextMembership,
      notes: `${nextType} membership renewed`,
      session,
    });
  }

  return null;
};

const maybeRecordRevocationRefund = async ({
  gym,
  userId,
  membership,
  occurredAt,
  reason,
  session,
}) => {
  const refundAmount = calculateRemainingCredit(gym, membership, occurredAt);
  if (refundAmount <= 0) {
    return null;
  }

  return createRevenueEvent({
    gym,
    userId,
    eventType: "revocation_refund",
    amount: -refundAmount,
    occurredAt,
    membershipType: membership?.membershipType || null,
    previousMembershipType: membership?.membershipType || null,
    previousMembership: membership,
    nextMembership: membership,
    notes: reason || "Prorated refund applied for membership revocation",
    session,
  });
};

const listGymRevenueEvents = async (gymId) => {
  return GymRevenueEvent.find({ gymId })
    .sort({ occurredAt: 1, _id: 1 })
    .lean();
};

module.exports = {
  calculateRemainingCredit,
  getMembershipPrice,
  listGymRevenueEvents,
  maybeRecordMembershipRevenueUpdate,
  maybeRecordRevocationRefund,
};
