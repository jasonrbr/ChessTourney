export const doubleRoundScoreTotalUnits = 4;

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

export function isCompleteDoubleRoundScore(
	whiteScoreUnits: number | null,
	blackScoreUnits: number | null
) {
	return (
		whiteScoreUnits != null &&
		blackScoreUnits != null &&
		whiteScoreUnits + blackScoreUnits === doubleRoundScoreTotalUnits
	);
}

export function isBlankScorePair(whiteScoreUnits: number | null, blackScoreUnits: number | null) {
	return whiteScoreUnits == null && blackScoreUnits == null;
}
