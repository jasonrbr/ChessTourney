import { calculateStandings, playerName, type StandingRegistration } from './standings';
import { scoreLabel, type GameResultCode } from './scoring';

// A USCF-style crosstable: one numbered row per player, each round showing the two
// games of the double round (color, result from the player's perspective, and the
// opponent's player number). Built entirely from data already loaded for the run page.

export type CrosstablePlayer = StandingRegistration;

export type CrosstableGameGroup = {
	whiteRegistrationId: string;
	blackRegistrationId: string;
	result: GameResultCode | null;
};

export type CrosstablePairing = {
	pairingType: 'GAME' | 'BYE';
	games?: CrosstableGameGroup[];
	byeRegistrationId: string | null;
	byeScoreUnits: number | null;
	byeType?: string | null;
};

export type CrosstableRound = {
	number: number;
	pairings: CrosstablePairing[];
};

export type CrosstableGameCell = {
	gameNumber: number;
	color: 'W' | 'B';
	result: 'W' | 'L' | 'D' | null;
	opponentNumber: number | null;
};

export type CrosstableRoundCell =
	| { type: 'GAMES'; games: CrosstableGameCell[] }
	| { type: 'BYE'; label: string }
	| { type: 'NONE' };

export type CrosstableRow = {
	number: number;
	name: string;
	rating: number | null;
	cellsByRound: Record<number, CrosstableRoundCell>;
	totalLabel: string;
};

export type SectionCrosstable = {
	roundNumbers: number[];
	rows: CrosstableRow[];
};

function resultFor(color: 'W' | 'B', result: GameResultCode): 'W' | 'L' | 'D' {
	if (result === 'DRAW') return 'D';
	const winnerColor = result === 'WHITE_WIN' ? 'W' : 'B';
	return color === winnerColor ? 'W' : 'L';
}

function byeLabel(byeType: string | null | undefined, byeScoreUnits: number | null) {
	const kind = byeType === 'REQUESTED' ? 'Requested bye' : byeType === 'ZERO_POINT' ? 'Zero-point bye' : 'Pairing bye';
	return `${kind} (${scoreLabel(byeScoreUnits) || '0'})`;
}

export function buildSectionCrosstable(
	registrations: CrosstablePlayer[],
	rounds: CrosstableRound[]
): SectionCrosstable {
	const standings = calculateStandings({
		registrations,
		rounds: rounds.map((round) => ({ pairings: round.pairings }))
	});

	// Player numbers follow final standing rank (1 = leader), the USCF crosstable convention.
	const numberByRegistration = new Map<string, number>();
	standings.forEach((row, index) => numberByRegistration.set(row.registration.id, index + 1));

	const roundNumbers = [...new Set(rounds.map((r) => r.number))].sort((a, b) => a - b);

	const rows: CrosstableRow[] = standings.map((standing) => {
		const registrationId = standing.registration.id;
		const cellsByRound: Record<number, CrosstableRoundCell> = {};

		for (const number of roundNumbers) {
			cellsByRound[number] = { type: 'NONE' };
		}

		for (const round of rounds) {
			const pairing = round.pairings.find(
				(p) =>
					p.byeRegistrationId === registrationId ||
					p.games?.some(
						(g) => g.whiteRegistrationId === registrationId || g.blackRegistrationId === registrationId
					)
			);
			if (!pairing) continue;

			if (pairing.pairingType === 'BYE') {
				cellsByRound[round.number] = {
					type: 'BYE',
					label: byeLabel(pairing.byeType, pairing.byeScoreUnits)
				};
				continue;
			}

			const games: CrosstableGameCell[] = (pairing.games ?? []).map((game, index) => {
				const isWhite = game.whiteRegistrationId === registrationId;
				const color: 'W' | 'B' = isWhite ? 'W' : 'B';
				const opponentId = isWhite ? game.blackRegistrationId : game.whiteRegistrationId;
				return {
					gameNumber: index + 1,
					color,
					result: game.result ? resultFor(color, game.result) : null,
					opponentNumber: numberByRegistration.get(opponentId) ?? null
				};
			});
			cellsByRound[round.number] = { type: 'GAMES', games };
		}

		return {
			number: numberByRegistration.get(registrationId) ?? 0,
			name: playerName(standing.registration.player),
			rating: standing.registration.seedRating,
			cellsByRound,
			totalLabel: scoreLabel(standing.pointsUnits) || '0'
		};
	});

	return { roundNumbers, rows };
}
