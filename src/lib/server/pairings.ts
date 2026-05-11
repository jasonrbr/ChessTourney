import { fail } from '@sveltejs/kit';
import type { Prisma } from '@prisma/client';
import { PairingStatus, PairingType, TournamentStatus } from '@prisma/client';
import { isBlankScorePair, isCompleteDoubleRoundScore, parseScoreUnits } from '$lib/domain/scoring';
import { planDoubleRoundSwissPairings } from '$lib/domain/pairings';
import { standingsFor } from './tournaments';
import { registrationIsPairingReady } from './registrations';
import { prisma } from './db';

export async function requestBye(slug: string, form: FormData) {
	const tournament = await prisma.tournament.findUnique({
		where: { slug },
		include: { sections: true }
	});
	if (!tournament) return fail(404, { message: 'Tournament not found.' });

	const registrationId = String(form.get('registrationId') ?? '');
	const roundNumber = Number(form.get('roundNumber') ?? 1);
	const scoreUnits =
		parseScoreUnits(form.get('score')) ?? tournament.requestedByeScore;
	const sectionId = String(form.get('sectionId') ?? tournament.sections[0]?.id ?? '');

	if (!registrationId || !sectionId || !Number.isFinite(roundNumber)) {
		return fail(400, { message: 'Choose a player and round for the bye.' });
	}

	await prisma.byeRequest.upsert({
		where: { registrationId_roundNumber: { registrationId, roundNumber } },
		update: { scoreUnits },
		create: { registrationId, roundNumber, scoreUnits, sectionId }
	});
}

export async function generateNextRound(slug: string) {
	const tournament = await prisma.tournament.findUnique({
		where: { slug },
		include: {
			sections: true,
			registrations: {
				include: { player: true, section: true }
			},
			rounds: {
				include: { pairings: true },
				orderBy: { number: 'asc' }
			}
		}
	});

	if (!tournament) return fail(404, { message: 'Tournament not found.' });
	if (tournament.sections.length === 0) {
		return fail(400, { message: 'Add a section before generating pairings.' });
	}

	const roundNumber = Math.max(0, ...tournament.rounds.map((r) => r.number)) + 1;
	if (roundNumber > tournament.totalRounds) {
		return fail(400, { message: 'All configured rounds have already been generated.' });
	}

	const standings = standingsFor(tournament);
	let createdRounds = 0;

	for (const section of tournament.sections) {
		const existingRound = tournament.rounds.find(
			(r) => r.sectionId === section.id && r.number === roundNumber
		);
		if (existingRound) continue;

		const active = standings
			.filter((row) => row.registration.sectionId === section.id)
			.filter((row) => registrationIsPairingReady(row.registration))
			.map((row) => ({
				id: row.registration.id,
				status: row.registration.status,
				eligibilityReviewStatus: row.registration.eligibilityReviewStatus,
				seedRating: row.registration.seedRating,
				pointsUnits: row.pointsUnits
			}));

		const byeRequests = await prisma.byeRequest.findMany({
			where: { sectionId: section.id, roundNumber }
		});

		if (active.length === 0 && byeRequests.length === 0) continue;

		const plannedPairings = planDoubleRoundSwissPairings({
			registrations: active,
			previousPairings: tournament.rounds
				.filter((r) => r.sectionId === section.id)
				.flatMap((r) => r.pairings),
			requestedByes: byeRequests.map((bye) => ({
				registrationId: bye.registrationId,
				scoreUnits: bye.scoreUnits
			})),
			pairingByeScoreUnits: tournament.pairingByeScore
		});

		const pairings: Prisma.PairingCreateWithoutRoundInput[] = plannedPairings.map((pairing) => {
			if (pairing.pairingType === PairingType.BYE) {
				return {
					boardNumber: pairing.boardNumber,
					pairingType: PairingType.BYE,
					status: PairingStatus.COMPLETE,
					byeRegistration: { connect: { id: pairing.byeRegistrationId } },
					byeType: pairing.byeType,
					byeScoreUnits: pairing.byeScoreUnits
				};
			}

			return {
				boardNumber: pairing.boardNumber,
				pairingType: PairingType.GAME,
				whiteFirstRegistration: { connect: { id: pairing.whiteFirstRegistrationId } },
				blackFirstRegistration: { connect: { id: pairing.blackFirstRegistrationId } }
			};
		});

		await prisma.round.create({
			data: {
				tournamentId: tournament.id,
				sectionId: section.id,
				number: roundNumber,
				pairings: { create: pairings }
			}
		});
		createdRounds += 1;
	}

	if (createdRounds === 0) {
		return fail(400, { message: 'No sections have registered players to pair.' });
	}

	if (tournament.status !== TournamentStatus.IN_PROGRESS) {
		await prisma.tournament.update({
			where: { id: tournament.id },
			data: { status: TournamentStatus.IN_PROGRESS }
		});
	}
}

export async function saveResults(form: FormData) {
	const roundId = String(form.get('roundId') ?? '');
	const pairingIds = form.getAll('pairingId').map(String);

	if (!roundId) return fail(400, { message: 'Round is required.' });

	for (const pairingId of pairingIds) {
		const whiteScore = parseScoreUnits(form.get(`whiteScore-${pairingId}`));
		const blackScore = parseScoreUnits(form.get(`blackScore-${pairingId}`));
		if (isBlankScorePair(whiteScore, blackScore)) continue;
		if (!isCompleteDoubleRoundScore(whiteScore, blackScore)) {
			return fail(400, { message: 'Each completed pairing score must total 2 points.' });
		}
	}

	await prisma.$transaction(async (tx) => {
		for (const pairingId of pairingIds) {
			const whiteScore = parseScoreUnits(form.get(`whiteScore-${pairingId}`));
			const blackScore = parseScoreUnits(form.get(`blackScore-${pairingId}`));
			if (!isCompleteDoubleRoundScore(whiteScore, blackScore)) continue;

			await tx.pairing.update({
				where: { id: pairingId },
				data: {
					whiteFirstScoreUnits: whiteScore,
					blackFirstScoreUnits: blackScore,
					status: PairingStatus.COMPLETE
				}
			});
		}

		const remaining = await tx.pairing.count({
			where: { roundId, status: PairingStatus.PENDING }
		});
		if (remaining === 0) {
			await tx.round.update({ where: { id: roundId }, data: { completedAt: new Date() } });
		}
	});

	return { savedRoundId: roundId };
}

export async function deleteRoundsFrom(slug: string, form: FormData) {
	const fromRoundNumber = Number(form.get('fromRoundNumber') ?? '');
	if (!Number.isFinite(fromRoundNumber) || fromRoundNumber < 1) {
		return fail(400, { message: 'Invalid round number.' });
	}

	const tournament = await prisma.tournament.findUnique({ where: { slug } });
	if (!tournament) return fail(404, { message: 'Tournament not found.' });

	await prisma.round.deleteMany({
		where: { tournamentId: tournament.id, number: { gte: fromRoundNumber } }
	});
}
