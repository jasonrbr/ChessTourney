import { describe, expect, it } from 'vitest';
import { gameUnitsFor, parseGameResult, parseScoreUnits, scoreLabel } from '$lib/domain/scoring';

describe('Double Round Swiss scoring', () => {
	it('parses the bye score values a TD can enter', () => {
		expect(parseScoreUnits('0')).toBe(0);
		expect(parseScoreUnits('0.5')).toBe(1);
		expect(parseScoreUnits('.5')).toBe(1);
		expect(parseScoreUnits('1/2')).toBe(1);
		expect(parseScoreUnits('1')).toBe(2);
		expect(parseScoreUnits('1.5')).toBe(3);
		expect(parseScoreUnits('2')).toBe(4);
	});

	it('rejects malformed or out-of-range bye scores', () => {
		expect(parseScoreUnits('')).toBeNull();
		expect(parseScoreUnits('0.25')).toBeNull();
		expect(parseScoreUnits('2.5')).toBeNull();
		expect(parseScoreUnits('win')).toBeNull();
	});

	it('parses per-game result codes and rejects anything else', () => {
		expect(parseGameResult('WHITE_WIN')).toBe('WHITE_WIN');
		expect(parseGameResult('DRAW')).toBe('DRAW');
		expect(parseGameResult('BLACK_WIN')).toBe('BLACK_WIN');
		expect(parseGameResult('')).toBeNull();
		expect(parseGameResult('white_win')).toBeNull();
		expect(parseGameResult('1-0')).toBeNull();
	});

	it('awards game units from the winning side, half a point for a draw', () => {
		expect(gameUnitsFor('WHITE_WIN', 'white')).toBe(2);
		expect(gameUnitsFor('WHITE_WIN', 'black')).toBe(0);
		expect(gameUnitsFor('BLACK_WIN', 'white')).toBe(0);
		expect(gameUnitsFor('BLACK_WIN', 'black')).toBe(2);
		expect(gameUnitsFor('DRAW', 'white')).toBe(1);
		expect(gameUnitsFor('DRAW', 'black')).toBe(1);
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
