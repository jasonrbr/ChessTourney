import { fail, redirect } from '@sveltejs/kit';
import type { Prisma } from '@prisma/client';
import {
	isBlankScorePair,
	isCompleteDoubleRoundScore,
	parseScoreUnits,
	scoreLabel as formatScoreLabel
} from '$lib/domain/scoring';
import { planDoubleRoundSwissPairings } from '$lib/domain/pairings';
import { calculateStandings, playerName as domainPlayerName } from '$lib/domain/standings';
import { prisma } from './db';

export function scoreLabel(scoreUnits: number | null | undefined) {
	return formatScoreLabel(scoreUnits);
}

export function slugify(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

export function dateInput(value: Date) {
	return value.toISOString().slice(0, 10);
}

export function scoreUnitsFromForm(value: FormDataEntryValue | null) {
	return parseScoreUnits(value);
}

const tournamentVisibilities = ['DRAFT', 'PUBLISHED'] as const;
const tournamentStatuses = [
	'SETUP',
	'REGISTRATION_OPEN',
	'REGISTRATION_CLOSED',
	'IN_PROGRESS',
	'COMPLETE'
] as const;
const unratedPolicies = ['ALLOWED', 'BLOCKED', 'TD_REVIEW'] as const;

function textFromForm(form: FormData, name: string, fallback = '') {
	return String(form.get(name) ?? fallback).trim();
}

function nullableTextFromForm(form: FormData, name: string) {
	return textFromForm(form, name) || null;
}

function dateFromInput(value: string) {
	return new Date(`${value}T00:00:00`);
}

function optionalIntFromForm(value: FormDataEntryValue | null) {
	const text = String(value ?? '').trim();
	if (!text) return null;

	const number = Number(text);
	return Number.isInteger(number) ? number : null;
}

function wholeNumberFromText(value: string) {
	if (!value) return null;

	const number = Number(value);
	return Number.isInteger(number) && number >= 0 ? number : undefined;
}

function positiveIntFromForm(value: FormDataEntryValue | null, fallback: number) {
	const number = optionalIntFromForm(value);
	return number != null && number > 0 ? number : fallback;
}

function enumFromForm<TAllowed extends readonly string[]>(
	value: FormDataEntryValue | null,
	allowed: TAllowed,
	fallback: TAllowed[number]
) {
	const text = String(value ?? '');
	return allowed.includes(text as TAllowed[number]) ? (text as TAllowed[number]) : fallback;
}

function sectionEligibilityFromForm(form: FormData) {
	const minRating = optionalIntFromForm(form.get('minRating'));
	const maxRating = optionalIntFromForm(form.get('maxRating'));
	const defaultUnratedPolicy = minRating == null ? 'ALLOWED' : 'TD_REVIEW';

	if (minRating != null && maxRating != null && minRating > maxRating) {
		return fail(400, { message: 'Section minimum rating cannot be higher than maximum rating.' });
	}

	return {
		minRating,
		maxRating,
		unratedPolicy: enumFromForm(form.get('unratedPolicy'), unratedPolicies, defaultUnratedPolicy)
	};
}

function sectionEligibilityMessage(
	section: {
		name: string;
		minRating: number | null;
		maxRating: number | null;
		unratedPolicy: string;
	},
	rating: number | null
) {
	if (rating == null) {
		if (section.unratedPolicy === 'BLOCKED') {
			return `${section.name} does not allow unrated players.`;
		}
		return null;
	}

	if (section.minRating != null && rating < section.minRating) {
		return `${section.name} requires a rating of at least ${section.minRating}.`;
	}

	if (section.maxRating != null && rating > section.maxRating) {
		return `${section.name} is limited to ratings ${section.maxRating} and below.`;
	}

	return null;
}

function validateSectionEligibility(
	section: {
		name: string;
		minRating: number | null;
		maxRating: number | null;
		unratedPolicy: string;
	},
	rating: number | null
) {
	const message = sectionEligibilityMessage(section, rating);
	return message ? fail(400, { message }) : null;
}

function registrationValuesFromForm(form: FormData, fallbackSectionId = '') {
	return {
		firstName: textFromForm(form, 'firstName'),
		lastName: textFromForm(form, 'lastName'),
		email: textFromForm(form, 'email'),
		rating: textFromForm(form, 'rating'),
		sectionId: textFromForm(form, 'sectionId', fallbackSectionId)
	};
}

function failRegistration(status: number, message: string, values: ReturnType<typeof registrationValuesFromForm>) {
	return fail(status, { message, values });
}

function eligibilityReviewFromSection(
	section: {
		name: string;
		unratedPolicy: string;
	},
	rating: number | null
) {
	if (rating == null && section.unratedPolicy === 'TD_REVIEW') {
		return {
			eligibilityReviewStatus: 'PENDING' as const,
			eligibilityReviewReason: `Unrated player requires TD review for ${section.name}.`
		};
	}

	return {
		eligibilityReviewStatus: 'NOT_REQUIRED' as const,
		eligibilityReviewReason: null
	};
}

function registrationNeedsEligibilityReview(registration: {
	seedRating: number | null;
	eligibilityReviewStatus: string;
	section?: { unratedPolicy: string };
}) {
	return (
		registration.eligibilityReviewStatus === 'PENDING' ||
		(registration.eligibilityReviewStatus === 'NOT_REQUIRED' &&
			registration.seedRating == null &&
			registration.section?.unratedPolicy === 'TD_REVIEW')
	);
}

function registrationIsPairingReady(registration: {
	status: string;
	seedRating: number | null;
	eligibilityReviewStatus: string;
	section?: { unratedPolicy: string };
}) {
	return registration.status === 'REGISTERED' && !registrationNeedsEligibilityReview(registration);
}

export async function listTournaments() {
	return prisma.tournament.findMany({
		include: { sections: true, registrations: true },
		orderBy: [{ startDate: 'asc' }, { name: 'asc' }]
	});
}

export async function listPublishedTournaments() {
	return prisma.tournament.findMany({
		where: { visibility: 'PUBLISHED' },
		include: { sections: true, registrations: true },
		orderBy: [{ startDate: 'asc' }, { name: 'asc' }]
	});
}

export async function getTournamentBySlug(slug: string) {
	return prisma.tournament.findUnique({
		where: { slug },
		include: {
			sections: { orderBy: { createdAt: 'asc' } },
			registrations: {
				include: { player: true, section: true },
				orderBy: [{ player: { lastName: 'asc' } }, { player: { firstName: 'asc' } }]
			},
			rounds: {
				include: {
					pairings: {
						include: {
							whiteFirstRegistration: { include: { player: true } },
							blackFirstRegistration: { include: { player: true } },
							byeRegistration: { include: { player: true } }
						},
						orderBy: { boardNumber: 'asc' }
					}
				},
				orderBy: { number: 'asc' }
			}
		}
	});
}

export type TournamentDetail = NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>;

export function playerName(player: { firstName: string; lastName: string }) {
	return domainPlayerName(player);
}

export function registrationIsOpen(tournament: { status: string }) {
	return tournament.status === 'SETUP' || tournament.status === 'REGISTRATION_OPEN';
}

export function standingsFor(tournament: TournamentDetail) {
	return calculateStandings({
		...tournament,
		registrations: tournament.registrations.filter(
			(registration) =>
				!registrationNeedsEligibilityReview(registration) &&
				registration.eligibilityReviewStatus !== 'REJECTED'
		)
	});
}

export async function createTournament(form: FormData) {
	const name = textFromForm(form, 'name');
	const organizationName = textFromForm(form, 'organizationName') || 'Tournament Organizer';
	const location = textFromForm(form, 'location');
	const startDate = textFromForm(form, 'startDate');
	const endDate = textFromForm(form, 'endDate', startDate) || startDate;
	const timeControl = textFromForm(form, 'timeControl') || '5+0';
	const sectionName = textFromForm(form, 'sectionName') || 'Open';
	const totalRounds = positiveIntFromForm(form.get('totalRounds'), 4);
	const pairingByeScore = scoreUnitsFromForm(form.get('pairingByeScore')) ?? 4;
	const requestedByeScore = scoreUnitsFromForm(form.get('requestedByeScore')) ?? 2;
	const sectionEligibility = sectionEligibilityFromForm(form);

	if (!name || !location || !startDate) {
		return fail(400, { message: 'Name, location, and start date are required.' });
	}

	if ('status' in sectionEligibility) return sectionEligibility;

	const baseSlug = slugify(name);
	const slug = await uniqueSlug(baseSlug || 'tournament');

	const tournament = await prisma.tournament.create({
		data: {
			name,
			slug,
			organizationName,
			location,
			startDate: new Date(`${startDate}T00:00:00`),
			endDate: new Date(`${endDate || startDate}T00:00:00`),
			timeControl,
			totalRounds,
			isRated: form.get('isRated') === 'on',
			affiliateName: nullableTextFromForm(form, 'affiliateName'),
			pairingByeScore,
			requestedByeScore,
			sections: { create: { name: sectionName, ...sectionEligibility } }
		}
	});

	throw redirect(303, `/org/tournaments/${tournament.slug}`);
}

async function uniqueSlug(baseSlug: string) {
	let slug = baseSlug;
	let suffix = 2;

	while (await prisma.tournament.findUnique({ where: { slug } })) {
		slug = `${baseSlug}-${suffix}`;
		suffix += 1;
	}

	return slug;
}

export async function updateTournament(slug: string, form: FormData) {
	const tournament = await prisma.tournament.findUnique({ where: { slug } });
	if (!tournament) return fail(404, { message: 'Tournament not found.' });

	const name = textFromForm(form, 'name');
	const organizationName = textFromForm(form, 'organizationName') || 'Tournament Organizer';
	const location = textFromForm(form, 'location');
	const startDate = textFromForm(form, 'startDate');
	const endDate = textFromForm(form, 'endDate', startDate) || startDate;
	const timeControl = textFromForm(form, 'timeControl') || '5+0';
	const totalRounds = positiveIntFromForm(form.get('totalRounds'), tournament.totalRounds);
	const pairingByeScore = scoreUnitsFromForm(form.get('pairingByeScore'));
	const requestedByeScore = scoreUnitsFromForm(form.get('requestedByeScore'));
	const isRated = form.get('isRated') === 'on';
	const affiliateName = nullableTextFromForm(form, 'affiliateName');
	const visibility = enumFromForm(form.get('visibility'), tournamentVisibilities, tournament.visibility);
	const status = enumFromForm(form.get('status'), tournamentStatuses, tournament.status);

	if (!name || !location || !startDate) {
		return fail(400, { message: 'Name, location, and start date are required.' });
	}

	if (pairingByeScore == null || requestedByeScore == null) {
		return fail(400, { message: 'Bye scores must be 0, 0.5, 1, 1.5, or 2.' });
	}

	if (visibility === 'PUBLISHED' && isRated && !affiliateName) {
		return fail(400, { message: 'Rated tournaments need an affiliate before publication.' });
	}

	await prisma.tournament.update({
		where: { slug },
		data: {
			name,
			organizationName,
			location,
			startDate: dateFromInput(startDate),
			endDate: dateFromInput(endDate),
			timeControl,
			totalRounds,
			isRated,
			affiliateName,
			pairingByeScore,
			requestedByeScore,
			visibility,
			status
		}
	});
}

export async function addSection(slug: string, form: FormData) {
	const tournament = await prisma.tournament.findUnique({ where: { slug } });
	if (!tournament) return fail(404, { message: 'Tournament not found.' });

	const name = textFromForm(form, 'name');
	const eligibility = sectionEligibilityFromForm(form);

	if (!name) return fail(400, { message: 'Section name is required.' });
	if ('status' in eligibility) return eligibility;

	await prisma.section.create({
		data: {
			tournamentId: tournament.id,
			name,
			...eligibility
		}
	});
}

export async function updateSection(slug: string, form: FormData) {
	const sectionId = textFromForm(form, 'sectionId');
	const name = textFromForm(form, 'name');
	const eligibility = sectionEligibilityFromForm(form);

	if (!sectionId || !name) return fail(400, { message: 'Section name is required.' });
	if ('status' in eligibility) return eligibility;

	const section = await prisma.section.findFirst({
		where: { id: sectionId, tournament: { slug } }
	});
	if (!section) return fail(404, { message: 'Section not found.' });

	await prisma.section.update({
		where: { id: sectionId },
		data: { name, ...eligibility }
	});
}

export async function removeSection(slug: string, form: FormData) {
	const sectionId = textFromForm(form, 'sectionId');
	const reassignmentMode = textFromForm(form, 'reassignmentMode', 'bulk');

	if (!sectionId) return fail(400, { message: 'Choose a section to remove.' });

	const section = await prisma.section.findFirst({
		where: { id: sectionId, tournament: { slug } },
		include: {
			registrations: true,
			rounds: true,
			tournament: { include: { sections: true } }
		}
	});
	if (!section) return fail(404, { message: 'Section not found.' });

	if (section.tournament.sections.length <= 1) {
		return fail(400, { message: 'Add another section before removing this one.' });
	}

	if (section.rounds.length > 0) {
		return fail(400, { message: 'Sections with generated rounds cannot be removed yet.' });
	}

	const destinationSections = section.tournament.sections.filter((entry) => entry.id !== section.id);
	const destinationById = new Map(destinationSections.map((entry) => [entry.id, entry]));
	const assignments = new Map<string, string>();

	if (section.registrations.length > 0) {
		if (reassignmentMode === 'bulk') {
			const destinationSectionId = textFromForm(form, 'bulkDestinationSectionId');
			if (!destinationById.has(destinationSectionId)) {
				return fail(400, { message: 'Choose a destination section for the registrations.' });
			}

			for (const registration of section.registrations) {
				assignments.set(registration.id, destinationSectionId);
			}
		} else if (reassignmentMode === 'perRegistration') {
			for (const registration of section.registrations) {
				const destinationSectionId = textFromForm(form, `destinationSectionId-${registration.id}`);
				if (!destinationById.has(destinationSectionId)) {
					return fail(400, { message: 'Choose a destination section for every registration.' });
				}
				assignments.set(registration.id, destinationSectionId);
			}
		} else {
			return fail(400, { message: 'Choose how to move the registrations.' });
		}
	}

	await prisma.$transaction(async (tx) => {
		for (const registration of section.registrations) {
			const destinationSectionId = assignments.get(registration.id);
			if (!destinationSectionId) continue;

			const destinationSection = destinationById.get(destinationSectionId);
			if (!destinationSection) continue;

			const review =
				registration.status === 'REGISTERED'
					? eligibilityReviewFromSection(destinationSection, registration.seedRating)
					: {
							eligibilityReviewStatus: registration.eligibilityReviewStatus,
							eligibilityReviewReason: registration.eligibilityReviewReason
						};

			await tx.registration.update({
				where: { id: registration.id },
				data: {
					sectionId: destinationSectionId,
					eligibilityReviewStatus: review.eligibilityReviewStatus,
					eligibilityReviewReason: review.eligibilityReviewReason,
					eligibilityReviewedAt: null
				}
			});

			await tx.byeRequest.updateMany({
				where: { registrationId: registration.id, sectionId: section.id },
				data: { sectionId: destinationSectionId }
			});
		}

		await tx.section.delete({ where: { id: section.id } });
	});
}

export async function registerPlayer(slug: string, form: FormData) {
	const tournament = await prisma.tournament.findUnique({
		where: { slug },
		include: { sections: true }
	});

	if (!tournament || tournament.visibility !== 'PUBLISHED') {
		return fail(404, { message: 'Tournament is not available for registration.' });
	}

	if (!registrationIsOpen(tournament)) {
		return fail(400, { message: 'Registration is closed.' });
	}

	const values = registrationValuesFromForm(form, tournament.sections[0]?.id ?? '');
	const ratingValue = wholeNumberFromText(values.rating);

	if (ratingValue === undefined) {
		return failRegistration(400, 'Rating must be a whole number.', values);
	}

	if (!values.firstName || !values.lastName || !values.sectionId) {
		return failRegistration(400, 'First name, last name, and section are required.', values);
	}

	const section = tournament.sections.find((entry) => entry.id === values.sectionId);
	if (!section) return failRegistration(400, 'Choose a valid section.', values);

	const eligibilityMessage = sectionEligibilityMessage(section, ratingValue);
	if (eligibilityMessage) return failRegistration(400, eligibilityMessage, values);
	const eligibilityReview = eligibilityReviewFromSection(section, ratingValue);

	await prisma.$transaction(async (tx) => {
		const player = await tx.player.create({
			data: {
				firstName: values.firstName,
				lastName: values.lastName,
				email: values.email || null,
				rating: ratingValue
			}
		});

		await tx.registration.create({
			data: {
				tournamentId: tournament.id,
				sectionId: values.sectionId,
				playerId: player.id,
				seedRating: player.rating,
				...eligibilityReview
			}
		});

		if (tournament.status === 'SETUP') {
			await tx.tournament.update({
				where: { id: tournament.id },
				data: { status: 'REGISTRATION_OPEN' }
			});
		}
	});

	throw redirect(303, `/tournaments/${slug}?registered=1`);
}

export async function publishTournament(slug: string) {
	const tournament = await prisma.tournament.findUnique({ where: { slug } });
	if (!tournament) return fail(404, { message: 'Tournament not found.' });
	if (tournament.isRated && !tournament.affiliateName) {
		return fail(400, { message: 'Rated tournaments need an affiliate before publication.' });
	}

	await prisma.tournament.update({
		where: { slug },
		data: {
			visibility: 'PUBLISHED',
			status: tournament.status === 'SETUP' ? 'REGISTRATION_OPEN' : tournament.status
		}
	});
}

export async function unpublishTournament(slug: string) {
	await prisma.tournament.update({
		where: { slug },
		data: { visibility: 'DRAFT' }
	});
}

export async function closeRegistration(slug: string) {
	await prisma.tournament.update({
		where: { slug },
		data: { status: 'REGISTRATION_CLOSED' }
	});
}

export async function reopenRegistration(slug: string) {
	await prisma.tournament.update({
		where: { slug },
		data: { status: 'REGISTRATION_OPEN' }
	});
}

export async function startTournament(slug: string) {
	await prisma.tournament.update({
		where: { slug },
		data: { status: 'IN_PROGRESS', visibility: 'PUBLISHED' }
	});
}

export async function returnToRegistrationClosed(slug: string) {
	await prisma.tournament.update({
		where: { slug },
		data: { status: 'REGISTRATION_CLOSED' }
	});
}

export async function completeTournament(slug: string) {
	await prisma.tournament.update({
		where: { slug },
		data: { status: 'COMPLETE' }
	});
}

export async function resumeTournament(slug: string) {
	await prisma.tournament.update({
		where: { slug },
		data: { status: 'IN_PROGRESS' }
	});
}

export async function addWalkIn(slug: string, form: FormData) {
	const tournament = await prisma.tournament.findUnique({ where: { slug }, include: { sections: true } });
	if (!tournament) return fail(404, { message: 'Tournament not found.' });

	const firstName = String(form.get('firstName') ?? '').trim();
	const lastName = String(form.get('lastName') ?? '').trim();
	const ratingValue = optionalIntFromForm(form.get('rating'));
	const sectionId = String(form.get('sectionId') ?? tournament.sections[0]?.id ?? '');

	if (!firstName || !lastName || !sectionId) {
		return fail(400, { message: 'First name, last name, and section are required.' });
	}

	const section = tournament.sections.find((entry) => entry.id === sectionId);
	if (!section) return fail(400, { message: 'Choose a valid section.' });

	const eligibilityError = validateSectionEligibility(section, ratingValue);
	if (eligibilityError) return eligibilityError;
	const eligibilityReview = eligibilityReviewFromSection(section, ratingValue);

	const player = await prisma.player.create({
		data: {
			firstName,
			lastName,
			rating: ratingValue
		}
	});

	await prisma.registration.create({
		data: {
			tournamentId: tournament.id,
			sectionId,
			playerId: player.id,
			seedRating: player.rating,
			...eligibilityReview
		}
	});
}

export async function approveRegistration(slug: string, form: FormData) {
	const registrationId = textFromForm(form, 'registrationId');
	if (!registrationId) return fail(400, { message: 'Choose a registration to approve.' });

	const registration = await prisma.registration.findFirst({
		where: { id: registrationId, tournament: { slug } }
	});
	if (!registration) return fail(404, { message: 'Registration not found.' });

	await prisma.registration.update({
		where: { id: registration.id },
		data: {
			status: 'REGISTERED',
			eligibilityReviewStatus: 'APPROVED',
			eligibilityReviewedAt: new Date()
		}
	});
}

export async function rejectRegistration(slug: string, form: FormData) {
	const registrationId = textFromForm(form, 'registrationId');
	if (!registrationId) return fail(400, { message: 'Choose a registration to reject.' });

	const registration = await prisma.registration.findFirst({
		where: { id: registrationId, tournament: { slug } }
	});
	if (!registration) return fail(404, { message: 'Registration not found.' });

	await prisma.registration.update({
		where: { id: registration.id },
		data: {
			status: 'WITHDRAWN',
			eligibilityReviewStatus: 'REJECTED',
			eligibilityReviewedAt: new Date()
		}
	});
}

export async function requestBye(slug: string, form: FormData) {
	const tournament = await prisma.tournament.findUnique({ where: { slug }, include: { sections: true } });
	if (!tournament) return fail(404, { message: 'Tournament not found.' });

	const registrationId = String(form.get('registrationId') ?? '');
	const roundNumber = Number(form.get('roundNumber') ?? 1);
	const scoreUnits = scoreUnitsFromForm(form.get('score')) ?? tournament.requestedByeScore;
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
			registrations: { include: { player: true } },
			rounds: { include: { pairings: true }, orderBy: { number: 'asc' } }
		}
	});

	if (!tournament) return fail(404, { message: 'Tournament not found.' });
	if (tournament.sections.length === 0) {
		return fail(400, { message: 'Add a section before generating pairings.' });
	}

	const roundNumber = Math.max(0, ...tournament.rounds.map((round) => round.number)) + 1;
	if (roundNumber > tournament.totalRounds) {
		return fail(400, { message: 'All configured rounds have already been generated.' });
	}

	const detail = await getTournamentBySlug(slug);
	if (!detail) return fail(404, { message: 'Tournament not found.' });

	const standings = standingsFor(detail);
	let createdRounds = 0;

	for (const section of tournament.sections) {
		const existingRound = tournament.rounds.find(
			(round) => round.sectionId === section.id && round.number === roundNumber
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
		const byeRequests = await prisma.byeRequest.findMany({ where: { sectionId: section.id, roundNumber } });
		if (active.length === 0 && byeRequests.length === 0) continue;

		const plannedPairings = planDoubleRoundSwissPairings({
			registrations: active,
			previousPairings: tournament.rounds
				.filter((round) => round.sectionId === section.id)
				.flatMap((round) => round.pairings),
			requestedByes: byeRequests.map((bye) => ({
				registrationId: bye.registrationId,
				scoreUnits: bye.scoreUnits
			})),
			pairingByeScoreUnits: tournament.pairingByeScore
		});
		const pairings: Prisma.PairingCreateWithoutRoundInput[] = plannedPairings.map((pairing) => {
			if (pairing.pairingType === 'BYE') {
				return {
					boardNumber: pairing.boardNumber,
					pairingType: 'BYE',
					status: 'COMPLETE',
					byeRegistration: { connect: { id: pairing.byeRegistrationId } },
					byeType: pairing.byeType,
					byeScoreUnits: pairing.byeScoreUnits
				};
			}

			return {
				boardNumber: pairing.boardNumber,
				pairingType: 'GAME',
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

	if (tournament.status !== 'IN_PROGRESS') {
		await prisma.tournament.update({ where: { id: tournament.id }, data: { status: 'IN_PROGRESS' } });
	}
}

export async function saveResults(form: FormData) {
	const roundId = String(form.get('roundId') ?? '');
	const pairingIds = form.getAll('pairingId').map(String);

	if (!roundId) return fail(400, { message: 'Round is required.' });

	for (const pairingId of pairingIds) {
		const whiteScore = scoreUnitsFromForm(form.get(`whiteScore-${pairingId}`));
		const blackScore = scoreUnitsFromForm(form.get(`blackScore-${pairingId}`));
		if (isBlankScorePair(whiteScore, blackScore)) continue;
		if (!isCompleteDoubleRoundScore(whiteScore, blackScore)) {
			return fail(400, { message: 'Each completed pairing score must total 2 points.' });
		}
	}

	await prisma.$transaction(async (tx) => {
		for (const pairingId of pairingIds) {
			const whiteScore = scoreUnitsFromForm(form.get(`whiteScore-${pairingId}`));
			const blackScore = scoreUnitsFromForm(form.get(`blackScore-${pairingId}`));
			if (!isCompleteDoubleRoundScore(whiteScore, blackScore)) continue;

			await tx.pairing.update({
				where: { id: pairingId },
				data: {
					whiteFirstScoreUnits: whiteScore,
					blackFirstScoreUnits: blackScore,
					status: 'COMPLETE'
				}
			});
		}

		const remaining = await tx.pairing.count({ where: { roundId, status: 'PENDING' } });
		if (remaining === 0) {
			await tx.round.update({ where: { id: roundId }, data: { completedAt: new Date() } });
		}
	});
}
