export type PairingRegistration = {
	id: string;
	status: 'REGISTERED' | 'WITHDRAWN' | string;
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
	const sorted = registrations
		.filter((registration) => registration.status === 'REGISTERED')
		.filter((registration) => !requestedByeIds.has(registration.id))
		.sort(comparePairingOrder);
	const previousOpponents = opponentMap(previousPairings);
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

	if (sorted.length % 2 === 1) {
		const byePlayer = [...sorted].reverse().find((registration) => !hasPairingBye(registration.id, previousPairings));
		const byeIndex = sorted.findIndex((registration) => registration.id === (byePlayer ?? sorted.at(-1))?.id);
		const [registration] = sorted.splice(byeIndex, 1);

		pairings.push({
			boardNumber: boardNumber++,
			pairingType: 'BYE',
			byeRegistrationId: registration.id,
			byeType: 'PAIRING',
			byeScoreUnits: pairingByeScoreUnits
		});
	}

	while (sorted.length > 0) {
		const white = sorted.shift();
		if (!white) break;
		let opponentIndex = sorted.findIndex((candidate) => !previousOpponents.get(white.id)?.has(candidate.id));
		if (opponentIndex < 0) opponentIndex = 0;
		const [black] = sorted.splice(opponentIndex, 1);
		if (!black) break;

		pairings.push({
			boardNumber: boardNumber++,
			pairingType: 'GAME',
			whiteFirstRegistrationId: white.id,
			blackFirstRegistrationId: black.id
		});
	}

	return pairings;
}

function comparePairingOrder(a: PairingRegistration, b: PairingRegistration) {
	if (b.pointsUnits !== a.pointsUnits) return b.pointsUnits - a.pointsUnits;
	return (b.seedRating ?? 0) - (a.seedRating ?? 0);
}

function opponentMap(pairings: ExistingPairing[]) {
	const map = new Map<string, Set<string>>();

	for (const pairing of pairings) {
		if (!pairing.whiteFirstRegistrationId || !pairing.blackFirstRegistrationId) continue;
		if (!map.has(pairing.whiteFirstRegistrationId)) map.set(pairing.whiteFirstRegistrationId, new Set());
		if (!map.has(pairing.blackFirstRegistrationId)) map.set(pairing.blackFirstRegistrationId, new Set());
		map.get(pairing.whiteFirstRegistrationId)?.add(pairing.blackFirstRegistrationId);
		map.get(pairing.blackFirstRegistrationId)?.add(pairing.whiteFirstRegistrationId);
	}

	return map;
}

function hasPairingBye(registrationId: string, pairings: ExistingPairing[]) {
	return pairings.some(
		(pairing) => pairing.byeRegistrationId === registrationId && pairing.byeType === 'PAIRING'
	);
}
