import { gameUnitsFor, type GameResultCode } from './scoring';

export type StandingPlayer = {
	firstName: string;
	lastName: string;
};

export type StandingRegistration = {
	id: string;
	seedRating: number | null;
	player: StandingPlayer;
};

export type StandingGame = {
	whiteRegistrationId: string;
	blackRegistrationId: string;
	result: GameResultCode | null;
};

export type StandingPairing = {
	pairingType: 'GAME' | 'BYE';
	games?: StandingGame[];
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
				continue;
			}

			for (const game of pairing.games ?? []) {
				if (game.result == null) continue;
				const whiteRow = byRegistration.get(game.whiteRegistrationId);
				const blackRow = byRegistration.get(game.blackRegistrationId);
				if (!whiteRow || !blackRow) continue;

				whiteRow.pointsUnits += gameUnitsFor(game.result, 'white');
				blackRow.pointsUnits += gameUnitsFor(game.result, 'black');
				whiteRow.games += 1;
				blackRow.games += 1;

				if (game.result === 'WHITE_WIN') {
					whiteRow.wins += 1;
					blackRow.losses += 1;
				} else if (game.result === 'BLACK_WIN') {
					blackRow.wins += 1;
					whiteRow.losses += 1;
				} else {
					whiteRow.draws += 1;
					blackRow.draws += 1;
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
