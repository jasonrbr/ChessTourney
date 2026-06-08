import { fail } from '@sveltejs/kit';
import type { Prisma } from '@prisma/client';
import { GameResult, PairingStatus, PairingType, TournamentStatus } from '@prisma/client';
import { parseGameResult, parseScoreUnits } from '$lib/domain/scoring';
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
				include: { pairings: { include: { games: true } } },
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
			// The pairing planner reasons about game-1 colors. Project each existing
			// pairing's first game onto its white-first/black-first shape.
			previousPairings: tournament.rounds
				.filter((r) => r.sectionId === section.id)
				.flatMap((r) => r.pairings)
				.map((pairing) => {
					const firstGame = pairing.games.find((g) => g.gameNumber === 1);
					return {
						whiteFirstRegistrationId: firstGame?.whiteRegistrationId ?? null,
						blackFirstRegistrationId: firstGame?.blackRegistrationId ?? null,
						byeRegistrationId: pairing.byeRegistrationId,
						byeType: pairing.byeType
					};
				}),
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

			// Double round: game 1 uses the planned colors, game 2 swaps them so each
			// player gets one White and one Black.
			return {
				boardNumber: pairing.boardNumber,
				pairingType: PairingType.GAME,
				games: {
					create: [
						{
							gameNumber: 1,
							whiteRegistration: { connect: { id: pairing.whiteFirstRegistrationId } },
							blackRegistration: { connect: { id: pairing.blackFirstRegistrationId } }
						},
						{
							gameNumber: 2,
							whiteRegistration: { connect: { id: pairing.blackFirstRegistrationId } },
							blackRegistration: { connect: { id: pairing.whiteFirstRegistrationId } }
						}
					]
				}
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

	const results = new Map(
		pairingIds.map((id) => [
			id,
			{
				game1: parseGameResult(form.get(`game1-${id}`)),
				game2: parseGameResult(form.get(`game2-${id}`))
			}
		])
	);

	for (const { game1, game2 } of results.values()) {
		if (game1 == null && game2 == null) continue;
		if (game1 == null || game2 == null) {
			return fail(400, { message: 'Enter a result for both games of a pairing, or leave both blank.' });
		}
	}

	await prisma.$transaction(async (tx) => {
		for (const [pairingId, { game1, game2 }] of results) {
			if (game1 == null || game2 == null) continue;

			await tx.game.updateMany({
				where: { pairingId, gameNumber: 1 },
				data: { result: game1 as GameResult }
			});
			await tx.game.updateMany({
				where: { pairingId, gameNumber: 2 },
				data: { result: game2 as GameResult }
			});
			await tx.pairing.update({
				where: { id: pairingId },
				data: { status: PairingStatus.COMPLETE }
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

export async function regenerateCurrentRound(slug: string) {
	const tournament = await prisma.tournament.findUnique({
		where: { slug },
		include: { rounds: { select: { number: true } } }
	});
	if (!tournament) return fail(404, { message: 'Tournament not found.' });

	const currentRoundNumber = Math.max(0, ...tournament.rounds.map((r) => r.number));
	if (currentRoundNumber === 0) return fail(400, { message: 'No round to regenerate.' });

	await prisma.round.deleteMany({
		where: { tournamentId: tournament.id, number: currentRoundNumber }
	});

	return generateNextRound(slug);
}
