import { fail, redirect } from '@sveltejs/kit';
import {
	EligibilityReviewStatus,
	RegistrationStatus,
	TournamentStatus,
	TournamentVisibility,
	UnratedPolicy
} from '@prisma/client';
import {
	textFromForm,
	nullableTextFromForm,
	dateFromInput,
	optionalIntFromForm,
	positiveIntFromForm,
	enumFromForm
} from './form-utils';
import { eligibilityDbFields, registrationNeedsEligibilityReview } from './registrations';
import { parseScoreUnits, scoreLabel as formatScoreLabel } from '$lib/domain/scoring';
import {
	calculateStandings,
	playerName as domainPlayerName,
	type StandingPairing
} from '$lib/domain/standings';
import { prisma } from './db';

// --- Display helpers ---

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

export function playerName(player: { firstName: string; lastName: string }) {
	return domainPlayerName(player);
}

export function registrationIsOpen(tournament: { status: TournamentStatus }) {
	return (
		tournament.status === TournamentStatus.SETUP ||
		tournament.status === TournamentStatus.REGISTRATION_OPEN
	);
}

// --- Queries ---

const fullPairingInclude = {
	whiteFirstRegistration: { include: { player: true } },
	blackFirstRegistration: { include: { player: true } },
	byeRegistration: { include: { player: true } }
} as const;

export async function listTournaments() {
	return prisma.tournament.findMany({
		include: { sections: true, registrations: true },
		orderBy: [{ startDate: 'asc' }, { name: 'asc' }]
	});
}

export async function listPublishedTournaments() {
	return prisma.tournament.findMany({
		where: { visibility: TournamentVisibility.PUBLISHED },
		include: { sections: true, registrations: true },
		orderBy: [{ startDate: 'asc' }, { name: 'asc' }]
	});
}

export async function getTournamentWorkspace(slug: string) {
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
						include: fullPairingInclude,
						orderBy: { boardNumber: 'asc' }
					}
				},
				orderBy: { number: 'asc' }
			}
		}
	});
}

export async function getTournamentForPublic(slug: string) {
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
						include: fullPairingInclude,
						orderBy: { boardNumber: 'asc' }
					}
				},
				orderBy: { number: 'asc' }
			}
		}
	});
}

export async function getTournamentForRegistration(slug: string) {
	return prisma.tournament.findUnique({
		where: { slug },
		include: { sections: { orderBy: { createdAt: 'asc' } } }
	});
}

export type TournamentWorkspace = NonNullable<Awaited<ReturnType<typeof getTournamentWorkspace>>>;

// --- Standings ---

type StandingsCompatible = {
	registrations: Array<{
		id: string;
		seedRating: number | null;
		eligibilityReviewStatus: EligibilityReviewStatus;
		status: string;
		sectionId: string;
		section?: { unratedPolicy: UnratedPolicy };
		player: { firstName: string; lastName: string };
	}>;
	rounds: Array<{ pairings: StandingPairing[] }>;
};

export function standingsFor(tournament: StandingsCompatible) {
	return calculateStandings({
		...tournament,
		registrations: tournament.registrations.filter(
			(r) =>
				!registrationNeedsEligibilityReview(r) &&
				r.eligibilityReviewStatus !== EligibilityReviewStatus.REJECTED
		)
	});
}

// --- Section form helpers ---

function scoreUnitsFromForm(value: FormDataEntryValue | null) {
	return parseScoreUnits(value);
}

function sectionEligibilityFromForm(form: FormData) {
	const minRating = optionalIntFromForm(form.get('minRating'));
	const maxRating = optionalIntFromForm(form.get('maxRating'));
	const defaultUnratedPolicy =
		minRating == null ? UnratedPolicy.ALLOWED : UnratedPolicy.TD_REVIEW;

	if (minRating != null && maxRating != null && minRating > maxRating) {
		return fail(400, { message: 'Section minimum rating cannot be higher than maximum rating.' });
	}

	return {
		minRating,
		maxRating,
		unratedPolicy: enumFromForm(
			form.get('unratedPolicy'),
			Object.values(UnratedPolicy),
			defaultUnratedPolicy
		)
	};
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

// --- Tournament mutations ---

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
	const visibility = enumFromForm(
		form.get('visibility'),
		Object.values(TournamentVisibility),
		tournament.visibility
	);
	const status = enumFromForm(
		form.get('status'),
		Object.values(TournamentStatus),
		tournament.status
	);

	if (!name || !location || !startDate) {
		return fail(400, { message: 'Name, location, and start date are required.' });
	}

	if (pairingByeScore == null || requestedByeScore == null) {
		return fail(400, { message: 'Bye scores must be 0, 0.5, 1, 1.5, or 2.' });
	}

	if (visibility === TournamentVisibility.PUBLISHED && isRated && !affiliateName) {
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

// --- Section mutations ---

export async function addSection(slug: string, form: FormData) {
	const tournament = await prisma.tournament.findUnique({ where: { slug } });
	if (!tournament) return fail(404, { message: 'Tournament not found.' });

	const name = textFromForm(form, 'name');
	const eligibility = sectionEligibilityFromForm(form);

	if (!name) return fail(400, { message: 'Section name is required.' });
	if ('status' in eligibility) return eligibility;

	await prisma.section.create({ data: { tournamentId: tournament.id, name, ...eligibility } });
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

	await prisma.section.update({ where: { id: sectionId }, data: { name, ...eligibility } });
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

	const destinationSections = section.tournament.sections.filter((s) => s.id !== section.id);
	const destinationById = new Map(destinationSections.map((s) => [s.id, s]));
	const assignments = new Map<string, string>();

	if (section.registrations.length > 0) {
		if (reassignmentMode === 'bulk') {
			const destinationSectionId = textFromForm(form, 'bulkDestinationSectionId');
			if (!destinationById.has(destinationSectionId)) {
				return fail(400, { message: 'Choose a destination section for the registrations.' });
			}
			for (const reg of section.registrations) {
				assignments.set(reg.id, destinationSectionId);
			}
		} else if (reassignmentMode === 'perRegistration') {
			for (const reg of section.registrations) {
				const destinationSectionId = textFromForm(form, `destinationSectionId-${reg.id}`);
				if (!destinationById.has(destinationSectionId)) {
					return fail(400, { message: 'Choose a destination section for every registration.' });
				}
				assignments.set(reg.id, destinationSectionId);
			}
		} else {
			return fail(400, { message: 'Choose how to move the registrations.' });
		}
	}

	await prisma.$transaction(async (tx) => {
		for (const reg of section.registrations) {
			const destinationSectionId = assignments.get(reg.id);
			if (!destinationSectionId) continue;

			const destinationSection = destinationById.get(destinationSectionId);
			if (!destinationSection) continue;

			const review =
				reg.status === RegistrationStatus.REGISTERED
					? eligibilityDbFields(destinationSection, reg.seedRating)
					: {
							eligibilityReviewStatus: reg.eligibilityReviewStatus,
							eligibilityReviewReason: reg.eligibilityReviewReason
						};

			await tx.registration.update({
				where: { id: reg.id },
				data: {
					sectionId: destinationSectionId,
					eligibilityReviewStatus: review.eligibilityReviewStatus,
					eligibilityReviewReason: review.eligibilityReviewReason,
					eligibilityReviewedAt: null
				}
			});

			await tx.byeRequest.updateMany({
				where: { registrationId: reg.id, sectionId: section.id },
				data: { sectionId: destinationSectionId }
			});
		}

		await tx.section.delete({ where: { id: section.id } });
	});
}

// --- Status transitions ---

export async function publishTournament(slug: string) {
	const tournament = await prisma.tournament.findUnique({ where: { slug } });
	if (!tournament) return fail(404, { message: 'Tournament not found.' });
	if (tournament.isRated && !tournament.affiliateName) {
		return fail(400, { message: 'Rated tournaments need an affiliate before publication.' });
	}

	await prisma.tournament.update({
		where: { slug },
		data: {
			visibility: TournamentVisibility.PUBLISHED,
			status:
				tournament.status === TournamentStatus.SETUP
					? TournamentStatus.REGISTRATION_OPEN
					: tournament.status
		}
	});
}

export async function unpublishTournament(slug: string) {
	await prisma.tournament.update({
		where: { slug },
		data: { visibility: TournamentVisibility.DRAFT }
	});
}

export async function closeRegistration(slug: string) {
	await prisma.tournament.update({
		where: { slug },
		data: { status: TournamentStatus.REGISTRATION_CLOSED }
	});
}

export async function reopenRegistration(slug: string) {
	await prisma.tournament.update({
		where: { slug },
		data: { status: TournamentStatus.REGISTRATION_OPEN }
	});
}

export async function startTournament(slug: string) {
	await prisma.tournament.update({
		where: { slug },
		data: { status: TournamentStatus.IN_PROGRESS, visibility: TournamentVisibility.PUBLISHED }
	});
}

export async function returnToRegistrationClosed(slug: string) {
	await prisma.tournament.update({
		where: { slug },
		data: { status: TournamentStatus.REGISTRATION_CLOSED }
	});
}

export async function completeTournament(slug: string) {
	await prisma.tournament.update({
		where: { slug },
		data: { status: TournamentStatus.COMPLETE }
	});
}

export async function resumeTournament(slug: string) {
	await prisma.tournament.update({
		where: { slug },
		data: { status: TournamentStatus.IN_PROGRESS }
	});
}
