import { describe, expect, it } from 'vitest';
import { planDoubleRoundSwissPairings, type PairingRegistration } from './pairings';

const registration = (
	id: string,
	seedRating: number,
	pointsUnits = 0,
	status: PairingRegistration['status'] = 'REGISTERED'
): PairingRegistration => ({
	id,
	status,
	seedRating,
	pointsUnits
});

describe('Double Round Swiss pairing planner', () => {
	it('pairs the first round by current score and seed rating', () => {
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
});
