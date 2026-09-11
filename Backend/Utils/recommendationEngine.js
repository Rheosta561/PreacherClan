/**
 * User-User Algorithm Implementation
 * Based on Pearson's correlation coefficient as described in collaborative filtering literature.
 * Parameters:
 *  - MinO: minimum number of common ratings/interactions between users.
 *  - MaxN: maximum number of user neighbors.
 */

// We treat implicit interactions (gym, workout split, friends) as "items".
function generateInteractionVector(user) {
  const items = {};
  
  if (user.gym) {
    items[`gym_${user.gym._id || user.gym}`] = 1;
  }
  
  if (user.workoutPlan) {
    items[`plan_${user.workoutPlan._id || user.workoutPlan}`] = 1;
  }
  
  if (user.partner && Array.isArray(user.partner)) {
    user.partner.forEach((p) => {
      items[`friend_${p._id || p}`] = 1;
    });
  }

  // Add more implicit features here as the app grows
  return items;
}

/**
 * Calculates Pearson Correlation between two users based on their item sets.
 * To provide variance (since our implicit ratings are 1), we look at the UNION of items
 * interacted with by either user A or user B. If a user didn't interact with an item, their rating is 0.
 */
function calculatePearsonSimilarity(itemsA, itemsB, minO = 5) {
  const allItemKeys = new Set([...Object.keys(itemsA), ...Object.keys(itemsB)]);
  
  // If the total interaction universe is less than MinO, we can still proceed but 
  // the paper suggests filtering. We will gracefully allow it if they just don't have enough data.
  const n = allItemKeys.size;
  if (n === 0) return 0; // No data at all

  let sumA = 0, sumB = 0;
  for (const key of allItemKeys) {
    sumA += itemsA[key] || 0;
    sumB += itemsB[key] || 0;
  }
  
  const meanA = sumA / n;
  const meanB = sumB / n;
  
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  
  let commonItems = 0;

  for (const key of allItemKeys) {
    const rA = itemsA[key] || 0;
    const rB = itemsB[key] || 0;
    
    if (rA > 0 && rB > 0) commonItems++;

    const diffA = rA - meanA;
    const diffB = rB - meanB;
    
    numerator += diffA * diffB;
    denomA += diffA * diffA;
    denomB += diffB * diffB;
  }
  
  // The paper specifies MinO (minimum common ratings). 
  // If they share absolutely nothing, Pearson is driven by mutual zeros, which isn't strong.
  // We can apply a penalty or strict filter, but for Gym Buddies, even slight overlap is good.
  
  if (denomA === 0 || denomB === 0) return 0;
  
  const similarity = numerator / Math.sqrt(denomA * denomB);
  return similarity;
}

/**
 * Reranks a list of candidate users based on their Pearson similarity to the active user.
 * @param {Object} activeUser - The main user
 * @param {Array} candidateUsers - The candidates fetched via Vector Search
 * @param {Number} maxN - Maximum neighbors to return (MaxN = 50)
 */
function rerankCandidates(activeUser, candidateUsers, maxN = 50) {
  const activeVector = generateInteractionVector(activeUser);
  
  const scoredCandidates = candidateUsers.map((candidate) => {
    const candidateVector = generateInteractionVector(candidate);
    const score = calculatePearsonSimilarity(activeVector, candidateVector);
    
    // We attach the collaborative filtering score
    // candidate.semanticScore represents the Vector Search score (passed in from aggregate)
    // We can blend them or just sort by Pearson.
    
    // Let's create a hybrid score:
    // Semantic score is usually between 0 and 1. Pearson is between -1 and 1.
    // We map Pearson from [-1, 1] to [0, 1] so it combines cleanly.
    const normalizedPearson = (score + 1) / 2;
    const semanticScore = candidate.semanticScore || 0;
    
    // Hybrid weight: 50% Semantic (Bio/Goals) + 50% Collaborative (Gym/Friends)
    const finalScore = (semanticScore * 0.5) + (normalizedPearson * 0.5);
    
    return {
      ...candidate,
      pearsonScore: score,
      finalScore: finalScore
    };
  });
  
  // Sort descending by hybrid final score
  scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);
  
  // Return top MaxN
  return scoredCandidates.slice(0, maxN);
}

module.exports = {
  generateInteractionVector,
  calculatePearsonSimilarity,
  rerankCandidates
};
