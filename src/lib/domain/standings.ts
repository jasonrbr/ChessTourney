export type StandingPlayer = {
	firstName: string;
	lastName: string;
};

export type StandingRegistration = {
	id: string;
	seedRating: number | null;
	player: StandingPlayer;
};

export type StandingPairing = {
	pairingType: 'GAME' | 'BYE';
	whiteFirstRegistrationId: string | null;
	blackFirstRegistrationId: string | null;
	whiteFirstScoreUnits: number | null;
	blackFirstScoreUnits: number | null;
	byeRegistrationId: string | null;
	byeScoreUnits: number | null;
};

export type StandingTournament<TRegistration extends StandingRegistration = StandingRegistration> = {
	registrations: TRegistration[];
	rounds: { pairings: StandingPairing[] }[];
};

export function playerName(player: StandingPlayer) {
	return `${player.firstName} ${player.lastName}`;
}

export function calculateStandings<TRegistration extends StandingRegistration>(
	tournament: StandingTournament<TRegistration>
) {
	const rows = tournament.registrations.map((registration) => ({
		registration,
		pointsUnits: 0,
		games: 0,
		wins: 0,
		draws: 0,
		losses: 0
	}));
	const byRegistration = new Map(rows.map((row) => [row.registration.id, row]));

	for (const round of tournament.rounds) {
		for (const pairing of round.pairings) {
			if (pairing.pairingType === 'BYE' && pairing.byeRegistrationId) {
				const row = byRegistration.get(pairing.byeRegistrationId);
				if (row && pairing.byeScoreUnits != null) {
					row.pointsUnits += pairing.byeScoreUnits;
				}
			}

			if (pairing.pairingType === 'GAME') {
				const whiteRow = pairing.whiteFirstRegistrationId
					? byRegistration.get(pairing.whiteFirstRegistrationId)
					: null;
				const blackRow = pairing.blackFirstRegistrationId
					? byRegistration.get(pairing.blackFirstRegistrationId)
					: null;

				if (
					whiteRow &&
					blackRow &&
					pairing.whiteFirstScoreUnits != null &&
					pairing.blackFirstScoreUnits != null
				) {
					whiteRow.pointsUnits += pairing.whiteFirstScoreUnits;
					blackRow.pointsUnits += pairing.blackFirstScoreUnits;
					whiteRow.games += 2;
					blackRow.games += 2;

					if (pairing.whiteFirstScoreUnits > pairing.blackFirstScoreUnits) {
						whiteRow.wins += 1;
						blackRow.losses += 1;
					} else if (pairing.whiteFirstScoreUnits < pairing.blackFirstScoreUnits) {
						blackRow.wins += 1;
						whiteRow.losses += 1;
					} else {
						whiteRow.draws += 1;
						blackRow.draws += 1;
					}
				}
			}
		}
	}

	return rows.sort((a, b) => {
		if (b.pointsUnits !== a.pointsUnits) return b.pointsUnits - a.pointsUnits;
		const ratingA = a.registration.seedRating ?? 0;
		const ratingB = b.registration.seedRating ?? 0;
		if (ratingB !== ratingA) return ratingB - ratingA;
		return playerName(a.registration.player).localeCompare(playerName(b.registration.player));
	});
}
