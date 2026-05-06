import { describe, expect, it } from 'vitest';
import { calculateStandings, type StandingPairing, type StandingRegistration } from '$lib/domain/standings';

const registration = (id: string, firstName: string, lastName: string, seedRating: number) => ({
	id,
	seedRating,
	player: { firstName, lastName }
});

const game = (
	whiteFirstRegistrationId: string,
	blackFirstRegistrationId: string,
	whiteFirstScoreUnits: number | null,
	blackFirstScoreUnits: number | null
): StandingPairing => ({
	pairingType: 'GAME',
	whiteFirstRegistrationId,
	blackFirstRegistrationId,
	whiteFirstScoreUnits,
	blackFirstScoreUnits,
	byeRegistrationId: null,
	byeScoreUnits: null
});

const bye = (byeRegistrationId: string, byeScoreUnits: number): StandingPairing => ({
	pairingType: 'BYE',
	whiteFirstRegistrationId: null,
	blackFirstRegistrationId: null,
	whiteFirstScoreUnits: null,
	blackFirstScoreUnits: null,
	byeRegistrationId,
	byeScoreUnits
});

describe('standings calculation', () => {
	it('sums completed two-game pairing scores and bye points', () => {
		const tournament = {
			registrations: [
				registration('a', 'Alice', 'Chen', 1800),
				registration('b', 'Bob', 'Smith', 1700),
				registration('c', 'Cara', 'Jones', 1600)
			],
			rounds: [
				{ pairings: [game('a', 'b', 3, 1), bye('c', 4)] },
				{ pairings: [game('a', 'c', 2, 2), bye('b', 2)] }
			]
		};

		const standings = calculateStandings(tournament);

		expect(standings.map((row) => [row.registration.id, row.pointsUnits])).toEqual([
			['c', 6],
			['a', 5],
			['b', 3]
		]);
		expect(standings.find((row) => row.registration.id === 'a')).toMatchObject({
			games: 4,
			wins: 1,
			draws: 1,
			losses: 0
		});
	});

	it('ignores incomplete pairing results', () => {
		const tournament = {
			registrations: [
				registration('a', 'Alice', 'Chen', 1800),
				registration('b', 'Bob', 'Smith', 1700)
			],
			rounds: [{ pairings: [game('a', 'b', 2, null)] }]
		};

		const standings = calculateStandings(tournament);

		expect(standings.map((row) => [row.registration.id, row.pointsUnits, row.games])).toEqual([
			['a', 0, 0],
			['b', 0, 0]
		]);
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
