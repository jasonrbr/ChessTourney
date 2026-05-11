export type PairingRegistration = {
	id: string;
	status: 'REGISTERED' | 'WITHDRAWN' | string;
	eligibilityReviewStatus?: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED' | string;
	seedRating: number | null;
	pointsUnits: number;
};

export type ExistingPairing = {
	whiteFirstRegistrationId: string | null;
	blackFirstRegistrationId: string | null;
	byeRegistrationId: string | null;
	byeType: 'PAIRING' | 'REQUESTED' | 'ZERO_POINT' | string | null;
};

export type RequestedBye = {
	registrationId: string;
	scoreUnits: number;
};

export type PlannedPairing =
	| {
			pairingType: 'GAME';
			boardNumber: number;
			whiteFirstRegistrationId: string;
			blackFirstRegistrationId: string;
	  }
	| {
			pairingType: 'BYE';
			boardNumber: number;
			byeRegistrationId: string;
			byeType: 'PAIRING' | 'REQUESTED';
			byeScoreUnits: number;
	  };

export function planDoubleRoundSwissPairings({
	registrations,
	previousPairings,
	requestedByes,
	pairingByeScoreUnits
}: {
	registrations: PairingRegistration[];
	previousPairings: ExistingPairing[];
	requestedByes: RequestedBye[];
	pairingByeScoreUnits: number;
}) {
	const requestedByeIds = new Set(requestedByes.map((bye) => bye.registrationId));
	const eligible = registrations
		.filter(isPairingReadyRegistration)
		.filter((r) => !requestedByeIds.has(r.id))
		.sort(comparePairingOrder);

	const opponents = opponentMap(previousPairings);
	const colorBalance = colorBalanceMap(previousPairings);
	const lastColor = lastColorMap(previousPairings);
	const pairings: PlannedPairing[] = [];
	let boardNumber = 1;

	for (const bye of requestedByes) {
		pairings.push({
			boardNumber: boardNumber++,
			pairingType: 'BYE',
			byeRegistrationId: bye.registrationId,
			byeType: 'REQUESTED',
			byeScoreUnits: bye.scoreUnits
		});
	}

	let players = [...eligible];
	if (players.length % 2 === 1) {
		const byePlayer =
			[...players].reverse().find((r) => !hasPairingBye(r.id, previousPairings)) ?? players.at(-1);
		const idx = players.findIndex((r) => r.id === byePlayer?.id);
		const [byeReg] = players.splice(idx, 1);
		pairings.push({
			boardNumber: boardNumber++,
			pairingType: 'BYE',
			byeRegistrationId: byeReg.id,
			byeType: 'PAIRING',
			byeScoreUnits: pairingByeScoreUnits
		});
	}

	// Dutch pairing: group by score, split each group in half, pair top[i] vs bottom[i].
	// Floaters from odd-sized groups carry forward to the next score group.
	// Backtrack within the split to avoid repeat opponents.
	const scoreGroups = buildScoreGroups(players);
	let floaters: PairingRegistration[] = [];

	for (const group of scoreGroups) {
		const combined = [...floaters, ...group];
		floaters = [];

		if (combined.length % 2 === 1) {
			floaters = [combined.pop()!];
		}

		const mid = combined.length / 2;
		const top = combined.slice(0, mid);
		const bottom = combined.slice(mid);
		const pairs = findValidPairing(top, bottom, opponents, 0, new Set());

		if (pairs !== null) {
			for (const [a, b] of pairs) {
				const [whiteId, blackId] = assignColors(a, b, colorBalance, lastColor);
				pairings.push({
					boardNumber: boardNumber++,
					pairingType: 'GAME',
					whiteFirstRegistrationId: whiteId,
					blackFirstRegistrationId: blackId
				});
			}
		} else {
			// No valid pairing for this group — carry everyone forward
			floaters = [...combined, ...floaters];
		}
	}

	// Fallback for any remaining floaters (edge case when all score groups exhausted).
	// bIdx === -1 means everyone is a repeat opponent; take index 0 as a last resort.
	while (floaters.length >= 2) {
		const a = floaters.shift()!;
		const bIdx = floaters.findIndex((c) => !opponents.get(a.id)?.has(c.id));
		const [b] = floaters.splice(bIdx >= 0 ? bIdx : 0, 1);
		const [whiteId, blackId] = assignColors(a, b, colorBalance, lastColor);
		pairings.push({
			boardNumber: boardNumber++,
			pairingType: 'GAME',
			whiteFirstRegistrationId: whiteId,
			blackFirstRegistrationId: blackId
		});
	}

	return pairings;
}

function buildScoreGroups(players: PairingRegistration[]): PairingRegistration[][] {
	const map = new Map<number, PairingRegistration[]>();
	for (const p of players) {
		if (!map.has(p.pointsUnits)) map.set(p.pointsUnits, []);
		map.get(p.pointsUnits)!.push(p);
	}
	// Players are already sorted by (points desc, rating desc) from the caller's .sort(),
	// so within each group they remain in rating order.
	return [...map.keys()].sort((a, b) => b - a).map((pts) => map.get(pts)!);
}

// Recursively find a complete pairing of top[topIdx..] with unused bottom players.
// Tries bottom players in order, backtracking when a repeat opponent blocks a completion.
function findValidPairing(
	top: PairingRegistration[],
	bottom: PairingRegistration[],
	opponents: Map<string, Set<string>>,
	topIdx: number,
	usedBottom: Set<number>
): Array<[PairingRegistration, PairingRegistration]> | null {
	if (topIdx === top.length) return [];

	for (let i = 0; i < bottom.length; i++) {
		if (usedBottom.has(i)) continue;
		if (opponents.get(top[topIdx].id)?.has(bottom[i].id)) continue;

		usedBottom.add(i);
		const rest = findValidPairing(top, bottom, opponents, topIdx + 1, usedBottom);
		if (rest !== null) return [[top[topIdx], bottom[i]], ...rest];
		usedBottom.delete(i);
	}

	return null;
}

function isPairingReadyRegistration(registration: PairingRegistration) {
	return (
		registration.status === 'REGISTERED' &&
		registration.eligibilityReviewStatus !== 'PENDING' &&
		registration.eligibilityReviewStatus !== 'REJECTED'
	);
}

function comparePairingOrder(a: PairingRegistration, b: PairingRegistration) {
	if (b.pointsUnits !== a.pointsUnits) return b.pointsUnits - a.pointsUnits;
	return (b.seedRating ?? 0) - (a.seedRating ?? 0);
}

function opponentMap(pairings: ExistingPairing[]) {
	const map = new Map<string, Set<string>>();

	for (const pairing of pairings) {
		if (!pairing.whiteFirstRegistrationId || !pairing.blackFirstRegistrationId) continue;
		if (!map.has(pairing.whiteFirstRegistrationId))
			map.set(pairing.whiteFirstRegistrationId, new Set());
		if (!map.has(pairing.blackFirstRegistrationId))
			map.set(pairing.blackFirstRegistrationId, new Set());
		map.get(pairing.whiteFirstRegistrationId)?.add(pairing.blackFirstRegistrationId);
		map.get(pairing.blackFirstRegistrationId)?.add(pairing.whiteFirstRegistrationId);
	}

	return map;
}

// Returns whitesPlayed - blacksPlayed for each player across previous game pairings.
function colorBalanceMap(pairings: ExistingPairing[]): Map<string, number> {
	const map = new Map<string, number>();
	for (const pairing of pairings) {
		if (!pairing.whiteFirstRegistrationId || !pairing.blackFirstRegistrationId) continue;
		map.set(pairing.whiteFirstRegistrationId, (map.get(pairing.whiteFirstRegistrationId) ?? 0) + 1);
		map.set(pairing.blackFirstRegistrationId, (map.get(pairing.blackFirstRegistrationId) ?? 0) - 1);
	}
	return map;
}

// Returns the most recently played color for each player (pairings assumed chronological order).
function lastColorMap(pairings: ExistingPairing[]): Map<string, 'white' | 'black'> {
	const map = new Map<string, 'white' | 'black'>();
	for (const pairing of pairings) {
		if (!pairing.whiteFirstRegistrationId || !pairing.blackFirstRegistrationId) continue;
		map.set(pairing.whiteFirstRegistrationId, 'white');
		map.set(pairing.blackFirstRegistrationId, 'black');
	}
	return map;
}

// USCF Rule 29E color assignment:
// 1. Player with lower whitesPlayed-blacksPlayed balance gets White.
// 2. On equal balance, the player who played Black most recently gets White.
// 3. If both have the same last color (or no history), top-half player (a) gets White.
function assignColors(
	a: PairingRegistration,
	b: PairingRegistration,
	colorBalance: Map<string, number>,
	lastColor: Map<string, 'white' | 'black'>
): [string, string] {
	const aBalance = colorBalance.get(a.id) ?? 0;
	const bBalance = colorBalance.get(b.id) ?? 0;
	if (aBalance !== bBalance) {
		return aBalance < bBalance ? [a.id, b.id] : [b.id, a.id];
	}
	const aLast = lastColor.get(a.id);
	const bLast = lastColor.get(b.id);
	if (aLast === 'black' && bLast !== 'black') return [a.id, b.id];
	if (bLast === 'black' && aLast !== 'black') return [b.id, a.id];
	if (aLast === 'white' && bLast !== 'white') return [b.id, a.id];
	if (bLast === 'white' && aLast !== 'white') return [a.id, b.id];
	return [a.id, b.id];
}

function hasPairingBye(registrationId: string, pairings: ExistingPairing[]) {
	return pairings.some(
		(pairing) => pairing.byeRegistrationId === registrationId && pairing.byeType === 'PAIRING'
	);
}
