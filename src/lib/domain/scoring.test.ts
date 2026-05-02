import { describe, expect, it } from 'vitest';
import {
	isBlankScorePair,
	isCompleteDoubleRoundScore,
	parseScoreUnits,
	scoreLabel
} from './scoring';

describe('Double Round Swiss scoring', () => {
	it('parses the score values a TD can enter for a two-game pairing', () => {
		expect(parseScoreUnits('0')).toBe(0);
		expect(parseScoreUnits('0.5')).toBe(1);
		expect(parseScoreUnits('.5')).toBe(1);
		expect(parseScoreUnits('1/2')).toBe(1);
		expect(parseScoreUnits('1')).toBe(2);
		expect(parseScoreUnits('1.5')).toBe(3);
		expect(parseScoreUnits('2')).toBe(4);
	});

	it('rejects malformed or out-of-range scores', () => {
		expect(parseScoreUnits('')).toBeNull();
		expect(parseScoreUnits('0.25')).toBeNull();
		expect(parseScoreUnits('2.5')).toBeNull();
		expect(parseScoreUnits('win')).toBeNull();
	});

	it('requires completed pairing scores to total two points', () => {
		expect(isCompleteDoubleRoundScore(4, 0)).toBe(true);
		expect(isCompleteDoubleRoundScore(3, 1)).toBe(true);
		expect(isCompleteDoubleRoundScore(2, 2)).toBe(true);
		expect(isCompleteDoubleRoundScore(1, 3)).toBe(true);
		expect(isCompleteDoubleRoundScore(0, 4)).toBe(true);

		expect(isCompleteDoubleRoundScore(4, 1)).toBe(false);
		expect(isCompleteDoubleRoundScore(2, null)).toBe(false);
		expect(isCompleteDoubleRoundScore(null, null)).toBe(false);
	});

	it('distinguishes blank scores from invalid partial scores', () => {
		expect(isBlankScorePair(null, null)).toBe(true);
		expect(isBlankScorePair(2, null)).toBe(false);
	});

	it('formats score units for display', () => {
		expect(scoreLabel(null)).toBe('');
		expect(scoreLabel(0)).toBe('0');
		expect(scoreLabel(1)).toBe('0.5');
		expect(scoreLabel(2)).toBe('1');
		expect(scoreLabel(3)).toBe('1.5');
		expect(scoreLabel(4)).toBe('2');
	});
});
