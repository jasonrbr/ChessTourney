import { fail, redirect } from '@sveltejs/kit';
import {
	EligibilityReviewStatus,
	RegistrationStatus,
	TournamentStatus,
	TournamentVisibility,
	UnratedPolicy
} from '@prisma/client';
import { textFromForm, optionalIntFromForm, wholeNumberFromText } from './form-utils';
import { prisma } from './db';

// --- Eligibility ---

type SectionEligibilityFields = {
	name: string;
	minRating: number | null;
	maxRating: number | null;
	unratedPolicy: UnratedPolicy;
};

export type EligibilityOutcome =
	| { outcome: 'HARD_BLOCKED'; message: string }
	| { outcome: 'NEEDS_REVIEW'; reason: string }
	| { outcome: 'ELIGIBLE' };

export function checkEligibility(
	section: SectionEligibilityFields,
	rating: number | null
): EligibilityOutcome {
	if (rating == null) {
		if (section.unratedPolicy === UnratedPolicy.BLOCKED) {
			return { outcome: 'HARD_BLOCKED', message: `${section.name} does not allow unrated players.` };
		}
		if (section.unratedPolicy === UnratedPolicy.TD_REVIEW) {
			return {
				outcome: 'NEEDS_REVIEW',
				reason: `Unrated player requires TD review for ${section.name}.`
			};
		}
		return { outcome: 'ELIGIBLE' };
	}

	if (section.minRating != null && rating < section.minRating) {
		return {
			outcome: 'HARD_BLOCKED',
			message: `${section.name} requires a rating of at least ${section.minRating}.`
		};
	}

	if (section.maxRating != null && rating > section.maxRating) {
		return {
			outcome: 'HARD_BLOCKED',
			message: `${section.name} is limited to ratings ${section.maxRating} and below.`
		};
	}

	return { outcome: 'ELIGIBLE' };
}

export function eligibilityDbFields(
	section: SectionEligibilityFields,
	rating: number | null
): { eligibilityReviewStatus: EligibilityReviewStatus; eligibilityReviewReason: string | null } {
	const outcome = checkEligibility(section, rating);
	if (outcome.outcome === 'NEEDS_REVIEW') {
		return {
			eligibilityReviewStatus: EligibilityReviewStatus.PENDING,
			eligibilityReviewReason: outcome.reason
		};
	}
	return {
		eligibilityReviewStatus: EligibilityReviewStatus.NOT_REQUIRED,
		eligibilityReviewReason: null
	};
}

export function registrationNeedsEligibilityReview(registration: {
	seedRating: number | null;
	eligibilityReviewStatus: EligibilityReviewStatus;
	section?: { unratedPolicy: UnratedPolicy };
}) {
	if (registration.eligibilityReviewStatus === EligibilityReviewStatus.PENDING) return true;
	// Catches the case where an unrated player registered before the section policy was
	// changed to TD_REVIEW — their status is still NOT_REQUIRED but they now need review.
	return (
		registration.eligibilityReviewStatus === EligibilityReviewStatus.NOT_REQUIRED &&
		registration.seedRating == null &&
		registration.section?.unratedPolicy === UnratedPolicy.TD_REVIEW
	);
}

export function registrationIsPairingReady(registration: {
	status: string;
	eligibilityReviewStatus: EligibilityReviewStatus;
	seedRating: number | null;
	section?: { unratedPolicy: UnratedPolicy };
}) {
	return (
		registration.status === RegistrationStatus.REGISTERED &&
		!registrationNeedsEligibilityReview(registration)
	);
}

// --- Registration form helpers ---

function registrationValuesFromForm(form: FormData, fallbackSectionId = '') {
	return {
		firstName: textFromForm(form, 'firstName'),
		lastName: textFromForm(form, 'lastName'),
		email: textFromForm(form, 'email'),
		rating: textFromForm(form, 'rating'),
		sectionId: textFromForm(form, 'sectionId', fallbackSectionId)
	};
}

function failRegistration(
	status: number,
	message: string,
	values: ReturnType<typeof registrationValuesFromForm>
) {
	return fail(status, { message, values });
}

// --- Registration actions ---

export async function registerPlayer(slug: string, form: FormData) {
	const tournament = await prisma.tournament.findUnique({
		where: { slug },
		include: { sections: true }
	});

	if (!tournament || tournament.visibility !== TournamentVisibility.PUBLISHED) {
		return fail(404, { message: 'Tournament is not available for registration.' });
	}

	if (
		tournament.status !== TournamentStatus.REGISTRATION_OPEN &&
		tournament.status !== TournamentStatus.SETUP
	) {
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

	const section = tournament.sections.find((s) => s.id === values.sectionId);
	if (!section) return failRegistration(400, 'Choose a valid section.', values);

	const eligibility = checkEligibility(section, ratingValue);
	if (eligibility.outcome === 'HARD_BLOCKED') {
		return failRegistration(400, eligibility.message, values);
	}

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
				...eligibilityDbFields(section, ratingValue)
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

export async function addWalkIn(slug: string, form: FormData) {
	const tournament = await prisma.tournament.findUnique({
		where: { slug },
		include: { sections: true }
	});
	if (!tournament) return fail(404, { message: 'Tournament not found.' });

	const firstName = textFromForm(form, 'firstName');
	const lastName = textFromForm(form, 'lastName');
	const ratingValue = optionalIntFromForm(form.get('rating'));
	const sectionId = textFromForm(form, 'sectionId', tournament.sections[0]?.id ?? '');

	if (!firstName || !lastName || !sectionId) {
		return fail(400, { message: 'First name, last name, and section are required.' });
	}

	const section = tournament.sections.find((s) => s.id === sectionId);
	if (!section) return fail(400, { message: 'Choose a valid section.' });

	const eligibility = checkEligibility(section, ratingValue);
	if (eligibility.outcome === 'HARD_BLOCKED') {
		return fail(400, { message: eligibility.message });
	}

	const player = await prisma.player.create({ data: { firstName, lastName, rating: ratingValue } });

	await prisma.registration.create({
		data: {
			tournamentId: tournament.id,
			sectionId,
			playerId: player.id,
			seedRating: player.rating,
			...eligibilityDbFields(section, ratingValue)
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
			status: RegistrationStatus.REGISTERED,
			eligibilityReviewStatus: EligibilityReviewStatus.APPROVED,
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
			status: RegistrationStatus.WITHDRAWN,
			eligibilityReviewStatus: EligibilityReviewStatus.REJECTED,
			eligibilityReviewedAt: new Date()
		}
	});
}
