import { describe, expect, it } from 'vitest';
import {
	calculateStandings,
	type StandingGame,
	type StandingPairing,
	type StandingRegistration
} from '$lib/domain/standings';

const registration = (id: string, firstName: string, lastName: string, seedRating: number) => ({
	id,
	seedRating,
	player: { firstName, lastName }
});

// A two-game double-round pairing: game 1 colors as given, game 2 swaps colors.
const pairing = (
	whiteFirstId: string,
	blackFirstId: string,
	game1: StandingGame['result'],
	game2: StandingGame['result']
): StandingPairing => ({
	pairingType: 'GAME',
	games: [
		{ whiteRegistrationId: whiteFirstId, blackRegistrationId: blackFirstId, result: game1 },
		{ whiteRegistrationId: blackFirstId, blackRegistrationId: whiteFirstId, result: game2 }
	],
	byeRegistrationId: null,
	byeScoreUnits: null
});

const bye = (byeRegistrationId: string, byeScoreUnits: number): StandingPairing => ({
	pairingType: 'BYE',
	byeRegistrationId,
	byeScoreUnits
});

describe('standings calculation', () => {
	it('sums per-game results and bye points', () => {
		// a sweeps b (WHITE_WIN then, after swap, BLACK_WIN) = 4 units; b = 0.
		// a vs c: split — a wins game 1, draws game 2 = 3 units; c = 1 unit.
		const tournament = {
			registrations: [
				registration('a', 'Alice', 'Chen', 1800),
				registration('b', 'Bob', 'Smith', 1700),
				registration('c', 'Cara', 'Jones', 1600)
			],
			rounds: [
				{ pairings: [pairing('a', 'b', 'WHITE_WIN', 'BLACK_WIN'), bye('c', 4)] },
				{ pairings: [pairing('a', 'c', 'WHITE_WIN', 'DRAW'), bye('b', 2)] }
			]
		};

		const standings = calculateStandings(tournament);

		expect(standings.map((row) => [row.registration.id, row.pointsUnits])).toEqual([
			['a', 7],
			['c', 5],
			['b', 2]
		]);
		expect(standings.find((row) => row.registration.id === 'a')).toMatchObject({
			games: 4,
			wins: 3,
			draws: 1,
			losses: 0
		});
	});

	it('counts a split double-round as one win and one loss, not a draw', () => {
		// a wins game 1, b wins game 2 (1 point each) — must NOT be recorded as draws.
		const tournament = {
			registrations: [
				registration('a', 'Alice', 'Chen', 1800),
				registration('b', 'Bob', 'Smith', 1700)
			],
			rounds: [{ pairings: [pairing('a', 'b', 'WHITE_WIN', 'WHITE_WIN')] }]
		};
		// game 1: a(white) beats b; game 2: b(white) beats a → 1 win + 1 loss each, 2 units each.

		const standings = calculateStandings(tournament);

		expect(standings.find((row) => row.registration.id === 'a')).toMatchObject({
			pointsUnits: 2,
			games: 2,
			wins: 1,
			draws: 0,
			losses: 1
		});
		expect(standings.find((row) => row.registration.id === 'b')).toMatchObject({
			pointsUnits: 2,
			games: 2,
			wins: 1,
			draws: 0,
			losses: 1
		});
	});

	it('ignores games without a result', () => {
		const tournament = {
			registrations: [
				registration('a', 'Alice', 'Chen', 1800),
				registration('b', 'Bob', 'Smith', 1700)
			],
			rounds: [{ pairings: [pairing('a', 'b', 'WHITE_WIN', null)] }]
		};

		const standings = calculateStandings(tournament);

		expect(standings.find((row) => row.registration.id === 'a')).toMatchObject({
			pointsUnits: 2,
			games: 1,
			wins: 1,
			losses: 0
		});
		expect(standings.find((row) => row.registration.id === 'b')).toMatchObject({
			pointsUnits: 0,
			games: 1,
			wins: 0,
			losses: 1
		});
	});

	it('uses seed rating then player name as current fallback ordering', () => {
		const tournament = {
			registrations: [
				registration('b', 'Bob', 'Smith', 1700),
				registration('a', 'Alice', 'Chen', 1800),
				registration('c', 'Cara', 'Jones', 1700)
			],
			rounds: []
		};

		const standings = calculateStandings(tournament);

		expect(standings.map((row) => row.registration.id)).toEqual(['a', 'b', 'c']);
	});

	it('preserves extra registration fields for service-level consumers', () => {
		const registrations = [
			{ ...registration('a', 'Alice', 'Chen', 1800), status: 'REGISTERED' },
			{ ...registration('b', 'Bob', 'Smith', 1700), status: 'WITHDRAWN' }
		];

		const standings = calculateStandings<{ status: string } & StandingRegistration>({
			registrations,
			rounds: []
		});

		expect(standings[0].registration.status).toBe('REGISTERED');
	});
});
