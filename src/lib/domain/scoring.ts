// Score units are half-points: 1 unit = 0.5 points. A single game is worth up to
// 2 units (a win), so a swept two-game double-round pairing totals 4 units = 2 points.
export const gameWinUnits = 2;

const scoreLabels = new Map([
	[0, '0'],
	[1, '0.5'],
	[2, '1'],
	[3, '1.5'],
	[4, '2']
]);

const scoreInputs = new Map([
	['0', 0],
	['0.0', 0],
	['.5', 1],
	['0.5', 1],
	['1/2', 1],
	['1', 2],
	['1.0', 2],
	['1.5', 3],
	['2', 4],
	['2.0', 4]
]);

export function scoreLabel(scoreUnits: number | null | undefined) {
	return scoreUnits == null ? '' : (scoreLabels.get(scoreUnits) ?? String(scoreUnits / 2));
}

export function parseScoreUnits(value: unknown) {
	const text = String(value ?? '').trim();
	if (text === '') return null;

	return scoreInputs.get(text) ?? null;
}

// --- Per-game results ---

export type GameResultCode = 'WHITE_WIN' | 'DRAW' | 'BLACK_WIN';

const gameResultCodes = new Set<GameResultCode>(['WHITE_WIN', 'DRAW', 'BLACK_WIN']);

export function parseGameResult(value: unknown): GameResultCode | null {
	const text = String(value ?? '').trim();
	return gameResultCodes.has(text as GameResultCode) ? (text as GameResultCode) : null;
}

// Units one side scores in a single game: win = 2 (1 point), draw = 1 (0.5), loss = 0.
export function gameUnitsFor(result: GameResultCode, side: 'white' | 'black'): number {
	if (result === 'DRAW') return 1;
	const winningSide = result === 'WHITE_WIN' ? 'white' : 'black';
	return side === winningSide ? gameWinUnits : 0;
}
