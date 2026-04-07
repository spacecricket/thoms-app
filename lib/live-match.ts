/**
 * Shared logic for live match point-by-point recording.
 * Handles serve rotation and set/match state computation.
 */

export type Player = "thom" | "opponent";

/**
 * Determine who serves the NEXT point given:
 * - who served first in the match (determined by toss)
 * - the current set number (1-indexed)
 * - the current score within this set (BEFORE the point is played)
 *
 * Rules:
 * - Serve alternates every 2 points throughout the set
 * - At deuce (10-10), serve alternates every point
 * - At the start of each set, the first server alternates
 *   (set 1 → firstServer, set 2 → the other player, etc.)
 */
export function computeServer(
  firstServerOfMatch: Player,
  setNumber: number,
  thomSetScore: number,
  oppSetScore: number,
): Player {
  const setIndex = setNumber - 1;
  const firstOfSet: Player =
    setIndex % 2 === 0
      ? firstServerOfMatch
      : firstServerOfMatch === "thom"
        ? "opponent"
        : "thom";

  const total = thomSetScore + oppSetScore;
  const isDeuce = thomSetScore >= 10 && oppSetScore >= 10;

  // How many "serve blocks" deep are we?
  // Non-deuce: each block is 2 points. Deuce: each block is 1 point.
  const block = isDeuce ? total % 2 : Math.floor(total / 2) % 2;

  if (block === 0) return firstOfSet;
  return firstOfSet === "thom" ? "opponent" : "thom";
}

/** Returns true if the set is over (someone won it). */
export function isSetOver(thomScore: number, oppScore: number): boolean {
  if (thomScore >= 11 && thomScore - oppScore >= 2) return true;
  if (oppScore >= 11 && oppScore - thomScore >= 2) return true;
  return false;
}

/** Returns true if the match is over (someone won 3 sets in a best-of-5). */
export function isMatchOver(thomSets: number, oppSets: number): boolean {
  return thomSets >= 3 || oppSets >= 3;
}

/** Compute the full state after a point is won by `winner`. */
export function applyPoint(
  firstServerOfMatch: Player,
  winner: Player,
  // current state BEFORE this point
  setNumber: number,
  thomSetScore: number,
  oppSetScore: number,
  thomSetsWon: number,
  oppSetsWon: number,
  pointInSet: number,
): {
  setNumber: number;
  thomSetScore: number;
  oppSetScore: number;
  thomSetsWon: number;
  oppSetsWon: number;
  pointInSet: number;
  serverThom: boolean;
  setComplete: boolean;
  matchComplete: boolean;
} {
  // Who serves THIS point (before score changes)
  const server = computeServer(
    firstServerOfMatch,
    setNumber,
    thomSetScore,
    oppSetScore,
  );
  const serverThom = server === "thom";

  // Update scores
  const newThomSet = thomSetScore + (winner === "thom" ? 1 : 0);
  const newOppSet = oppSetScore + (winner === "opponent" ? 1 : 0);

  const setComplete = isSetOver(newThomSet, newOppSet);

  let newThomSets = thomSetsWon;
  let newOppSets = oppSetsWon;
  let newSetNumber = setNumber;
  let newPointInSet = pointInSet + 1;
  let newThomSetScore = newThomSet;
  let newOppSetScore = newOppSet;

  if (setComplete) {
    if (winner === "thom") newThomSets++;
    else newOppSets++;
  }

  const matchComplete = isMatchOver(newThomSets, newOppSets);

  return {
    setNumber: newSetNumber,
    thomSetScore: newThomSetScore,
    oppSetScore: newOppSetScore,
    thomSetsWon: newThomSets,
    oppSetsWon: newOppSets,
    pointInSet: newPointInSet,
    serverThom,
    setComplete,
    matchComplete,
  };
}

/** Compute the "next server" indicator from the current score (after all points). */
export function nextServer(
  firstServerOfMatch: Player,
  setNumber: number,
  thomSetScore: number,
  oppSetScore: number,
  setComplete: boolean,
): Player {
  if (setComplete) {
    // Next set starts — new set number, score 0-0
    return computeServer(firstServerOfMatch, setNumber + 1, 0, 0);
  }
  return computeServer(firstServerOfMatch, setNumber, thomSetScore, oppSetScore);
}
