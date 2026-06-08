import { describe, expect, it } from 'vitest';
import {
	buildSectionCrosstable,
	type CrosstableRound,
	type CrosstableRoundCell
} from '$lib/domain/crosstable';

const registration = (id: string, firstName: string, lastName: string, seedRating: number) => ({
	id,
	seedRating,
	player: { firstName, lastName }
});

const gamePairing = (
	whiteFirstId: string,
	blackFirstId: string,
	game1: 'WHITE_WIN' | 'DRAW' | 'BLACK_WIN' | null,
	game2: 'WHITE_WIN' | 'DRAW' | 'BLACK_WIN' | null
): CrosstableRound['pairings'][number] => ({
	pairingType: 'GAME',
	games: [
		{ whiteRegistrationId: whiteFirstId, blackRegistrationId: blackFirstId, result: game1 },
		{ whiteRegistrationId: blackFirstId, blackRegistrationId: whiteFirstId, result: game2 }
	],
	byeRegistrationId: null,
	byeScoreUnits: null
});

const byePairing = (
	id: string,
	byeScoreUnits: number,
	byeType = 'PAIRING'
): CrosstableRound['pairings'][number] => ({
	pairingType: 'BYE',
	byeRegistrationId: id,
	byeScoreUnits,
	byeType
});

const asGames = (cell: CrosstableRoundCell) => (cell.type === 'GAMES' ? cell.games : []);

describe('section crosstable', () => {
	it('numbers players by standing rank and totals their scores', () => {
		// a sweeps b; c byes. Round 2: a beats c, b byes.
		const rounds: CrosstableRound[] = [
			{ number: 1, pairings: [gamePairing('a', 'b', 'WHITE_WIN', 'BLACK_WIN'), byePairing('c', 4)] },
			{ number: 2, pairings: [gamePairing('a', 'c', 'WHITE_WIN', 'BLACK_WIN'), byePairing('b', 2)] }
		];

		const table = buildSectionCrosstable(
			[
				registration('a', 'Alice', 'Chen', 1800),
				registration('b', 'Bob', 'Smith', 1700),
				registration('c', 'Cara', 'Jones', 1600)
			],
			rounds
		);

		expect(table.roundNumbers).toEqual([1, 2]);
		// a: 4 + 4 = 8 units, c: 4 + 0 = 4, b: 0 + 2 = 2 → ranks a, c, b
		expect(table.rows.map((r) => [r.number, r.name, r.totalLabel])).toEqual([
			[1, 'Alice Chen', '4'],
			[2, 'Cara Jones', '2'],
			[3, 'Bob Smith', '1']
		]);
	});

	it('records each game with color, result, and the opponent number — symmetrically', () => {
		const rounds: CrosstableRound[] = [
			{ number: 1, pairings: [gamePairing('a', 'b', 'WHITE_WIN', 'DRAW')] }
		];

		const table = buildSectionCrosstable(
			[registration('a', 'Alice', 'Chen', 1800), registration('b', 'Bob', 'Smith', 1700)],
			rounds
		);

		const aRow = table.rows.find((r) => r.name === 'Alice Chen')!;
		const bRow = table.rows.find((r) => r.name === 'Bob Smith')!;

		// Alice: game 1 White win vs Bob; game 2 Black draw vs Bob.
		expect(asGames(aRow.cellsByRound[1])).toEqual([
			{ gameNumber: 1, color: 'W', result: 'W', opponentNumber: bRow.number },
			{ gameNumber: 2, color: 'B', result: 'D', opponentNumber: bRow.number }
		]);
		// Bob is the mirror: game 1 Black loss vs Alice; game 2 White draw vs Alice.
		expect(asGames(bRow.cellsByRound[1])).toEqual([
			{ gameNumber: 1, color: 'B', result: 'L', opponentNumber: aRow.number },
			{ gameNumber: 2, color: 'W', result: 'D', opponentNumber: aRow.number }
		]);
	});

	it('represents byes and unplayed rounds distinctly', () => {
		const rounds: CrosstableRound[] = [{ number: 1, pairings: [byePairing('a', 2, 'REQUESTED')] }];

		const table = buildSectionCrosstable([registration('a', 'Alice', 'Chen', 1800)], rounds);
		const aRow = table.rows[0];

		expect(aRow.cellsByRound[1]).toEqual({ type: 'BYE', label: 'Requested bye (1)' });
	});

	it('leaves a game result null until it is entered', () => {
		const rounds: CrosstableRound[] = [
			{ number: 1, pairings: [gamePairing('a', 'b', 'WHITE_WIN', null)] }
		];

		const table = buildSectionCrosstable(
			[registration('a', 'Alice', 'Chen', 1800), registration('b', 'Bob', 'Smith', 1700)],
			rounds
		);
		const aRow = table.rows.find((r) => r.name === 'Alice Chen')!;

		expect(asGames(aRow.cellsByRound[1])[1].result).toBeNull();
	});
});
