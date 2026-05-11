import { describe, expect, it } from 'vitest';
import { planDoubleRoundSwissPairings, type PairingRegistration } from '$lib/domain/pairings';

const registration = (
	id: string,
	seedRating: number,
	pointsUnits = 0,
	status: PairingRegistration['status'] = 'REGISTERED',
	eligibilityReviewStatus: PairingRegistration['eligibilityReviewStatus'] = 'NOT_REQUIRED'
): PairingRegistration => ({
	id,
	status,
	eligibilityReviewStatus,
	seedRating,
	pointsUnits
});

describe('Double Round Swiss pairing planner', () => {
	it('pairs round 1 Dutch-style: splits score group in half, pairs top[i] vs bottom[i]', () => {
		// 4 players all at 0 pts: group=[a,b,c,d], top=[a,b], bottom=[c,d]
		// → a vs c (board 1), b vs d (board 2)
		const pairings = planDoubleRoundSwissPairings({
			registrations: [
				registration('a', 1800),
				registration('b', 1700),
				registration('c', 1600),
				registration('d', 1500)
			],
			previousPairings: [],
			requestedByes: [],
			pairingByeScoreUnits: 4
		});

		expect(pairings).toEqual([
			{
				boardNumber: 1,
				pairingType: 'GAME',
				whiteFirstRegistrationId: 'a',
				blackFirstRegistrationId: 'c'
			},
			{
				boardNumber: 2,
				pairingType: 'GAME',
				whiteFirstRegistrationId: 'b',
				blackFirstRegistrationId: 'd'
			}
		]);
	});

	it('keeps score groups separate when they are even-sized', () => {
		// After round 1 (a-c, b-d): a and b won (2 pts each), c and d lost (0 pts each)
		// Score group 2pts: [a,b] → a vs b
		// Score group 0pts: [c,d] → c vs d
		const pairings = planDoubleRoundSwissPairings({
			registrations: [
				registration('a', 1800, 2),
				registration('b', 1700, 2),
				registration('c', 1600, 0),
				registration('d', 1500, 0)
			],
			previousPairings: [
				{ whiteFirstRegistrationId: 'a', blackFirstRegistrationId: 'c', byeRegistrationId: null, byeType: null },
				{ whiteFirstRegistrationId: 'b', blackFirstRegistrationId: 'd', byeRegistrationId: null, byeType: null }
			],
			requestedByes: [],
			pairingByeScoreUnits: 4
		});

		expect(pairings).toEqual([
			{
				boardNumber: 1,
				pairingType: 'GAME',
				whiteFirstRegistrationId: 'a',
				blackFirstRegistrationId: 'b'
			},
			{
				boardNumber: 2,
				pairingType: 'GAME',
				whiteFirstRegistrationId: 'c',
				blackFirstRegistrationId: 'd'
			}
		]);
	});

	it('floats a player down when a score group is odd-sized', () => {
		// Score group 2pts: [a,b,c] (odd) → a vs b, c floats down
		// Score group 0pts: [d,e,f,g] → combined with c: [c,d,e,f,g]... wait, let's keep it simple
		// Score group 2pts: [a,b,c] → a vs b, c floats to 0pts group
		// Score group 0pts: [d,e] + floater c = [c,d,e] (still odd) → c vs d, e floats
		// Better: score group 2pts: [a,b,c], 0pts: [d,e,f,g]
		// 2pts group odd → c floats. combined=[c,d,e,f,g] (5 players, odd) → g floats
		// Pair: [c,d,e,f] → c vs e, d vs f
		const pairings = planDoubleRoundSwissPairings({
			registrations: [
				registration('a', 1800, 2),
				registration('b', 1700, 2),
				registration('c', 1600, 2),
				registration('d', 1500, 0),
				registration('e', 1400, 0),
				registration('f', 1300, 0),
				registration('g', 1200, 0)
			],
			previousPairings: [],
			requestedByes: [],
			pairingByeScoreUnits: 4
		});

		// 7 players is odd → g (lowest rated) gets pairing bye first
		// 2pt group [a,b,c]: odd → c floats, pair a vs b
		// 0pt group [d,e,f] + floater [c] = [c,d,e,f]: top=[c,d], bottom=[e,f] → c vs e, d vs f
		expect(pairings).toContainEqual(expect.objectContaining({ pairingType: 'BYE', byeRegistrationId: 'g', byeType: 'PAIRING' }));
		expect(pairings).toContainEqual(expect.objectContaining({ pairingType: 'GAME', whiteFirstRegistrationId: 'a', blackFirstRegistrationId: 'b' }));
		expect(pairings).toContainEqual(expect.objectContaining({ pairingType: 'GAME', whiteFirstRegistrationId: 'c', blackFirstRegistrationId: 'e' }));
		expect(pairings).toContainEqual(expect.objectContaining({ pairingType: 'GAME', whiteFirstRegistrationId: 'd', blackFirstRegistrationId: 'f' }));
	});

	it('keeps requested-bye players out of pairings and awards the configured score', () => {
		const pairings = planDoubleRoundSwissPairings({
			registrations: [
				registration('a', 1800),
				registration('b', 1700),
				registration('c', 1600)
			],
			previousPairings: [],
			requestedByes: [{ registrationId: 'b', scoreUnits: 2 }],
			pairingByeScoreUnits: 4
		});

		expect(pairings).toEqual([
			{
				boardNumber: 1,
				pairingType: 'BYE',
				byeRegistrationId: 'b',
				byeType: 'REQUESTED',
				byeScoreUnits: 2
			},
			{
				boardNumber: 2,
				pairingType: 'GAME',
				whiteFirstRegistrationId: 'a',
				blackFirstRegistrationId: 'c'
			}
		]);
	});

	it('assigns an odd-player pairing bye and avoids repeat pairing byes when possible', () => {
		const pairings = planDoubleRoundSwissPairings({
			registrations: [
				registration('a', 1800),
				registration('b', 1700),
				registration('c', 1600)
			],
			previousPairings: [
				{
					whiteFirstRegistrationId: null,
					blackFirstRegistrationId: null,
					byeRegistrationId: 'c',
					byeType: 'PAIRING'
				}
			],
			requestedByes: [],
			pairingByeScoreUnits: 4
		});

		expect(pairings).toContainEqual({
			boardNumber: 1,
			pairingType: 'BYE',
			byeRegistrationId: 'b',
			byeType: 'PAIRING',
			byeScoreUnits: 4
		});
		expect(pairings).toContainEqual({
			boardNumber: 2,
			pairingType: 'GAME',
			whiteFirstRegistrationId: 'a',
			blackFirstRegistrationId: 'c'
		});
	});

	it('avoids repeat opponents when another pairing is available', () => {
		// All 4 at same score; a-b played before.
		// Natural Dutch: top=[a,b], bottom=[c,d] → a vs c, b vs d (both valid, no repeats)
		const pairings = planDoubleRoundSwissPairings({
			registrations: [
				registration('a', 1800, 4),
				registration('b', 1700, 4),
				registration('c', 1600, 4),
				registration('d', 1500, 4)
			],
			previousPairings: [
				{
					whiteFirstRegistrationId: 'a',
					blackFirstRegistrationId: 'b',
					byeRegistrationId: null,
					byeType: null
				}
			],
			requestedByes: [],
			pairingByeScoreUnits: 4
		});

		expect(pairings[0]).toMatchObject({
			pairingType: 'GAME',
			whiteFirstRegistrationId: 'a',
			blackFirstRegistrationId: 'c'
		});
		expect(pairings[1]).toMatchObject({
			pairingType: 'GAME',
			whiteFirstRegistrationId: 'b',
			blackFirstRegistrationId: 'd'
		});
	});

	it('backtracking: swaps bottom-half opponents when natural pairing hits a repeat', () => {
		// All 4 at same score; a-c played before.
		// Natural Dutch: top=[a,b], bottom=[c,d] → a vs c (repeat! skip), try a vs d → ok
		// Then b vs c → ok
		const pairings = planDoubleRoundSwissPairings({
			registrations: [
				registration('a', 1800, 4),
				registration('b', 1700, 4),
				registration('c', 1600, 4),
				registration('d', 1500, 4)
			],
			previousPairings: [
				{
					whiteFirstRegistrationId: 'a',
					blackFirstRegistrationId: 'c',
					byeRegistrationId: null,
					byeType: null
				}
			],
			requestedByes: [],
			pairingByeScoreUnits: 4
		});

		expect(pairings[0]).toMatchObject({
			pairingType: 'GAME',
			whiteFirstRegistrationId: 'a',
			blackFirstRegistrationId: 'd'
		});
		expect(pairings[1]).toMatchObject({
			pairingType: 'GAME',
			whiteFirstRegistrationId: 'b',
			blackFirstRegistrationId: 'c'
		});
	});

	it('does not pair withdrawn players', () => {
		const pairings = planDoubleRoundSwissPairings({
			registrations: [
				registration('a', 1800),
				registration('b', 1700, 0, 'WITHDRAWN'),
				registration('c', 1600)
			],
			previousPairings: [],
			requestedByes: [],
			pairingByeScoreUnits: 4
		});

		expect(pairings).toEqual([
			{
				boardNumber: 1,
				pairingType: 'GAME',
				whiteFirstRegistrationId: 'a',
				blackFirstRegistrationId: 'c'
			}
		]);
	});

	it('does not pair players who still need eligibility review', () => {
		const pairings = planDoubleRoundSwissPairings({
			registrations: [
				registration('a', 1800),
				registration('b', 1700, 0, 'REGISTERED', 'PENDING'),
				registration('c', 1600)
			],
			previousPairings: [],
			requestedByes: [],
			pairingByeScoreUnits: 4
		});

		expect(pairings).toEqual([
			{
				boardNumber: 1,
				pairingType: 'GAME',
				whiteFirstRegistrationId: 'a',
				blackFirstRegistrationId: 'c'
			}
		]);
	});
});
