import { error } from '@sveltejs/kit';
import { EligibilityReviewStatus } from '@prisma/client';
import { getTournamentWorkspace } from '$lib/server/tournaments';
import { registrationNeedsEligibilityReview } from '$lib/server/registrations';
import { buildSectionCrosstable } from '$lib/domain/crosstable';

export async function load({ params }) {
	const tournament = await getTournamentWorkspace(params.slug);

	if (!tournament) {
		throw error(404, 'Tournament not found');
	}

	// Mirror the standings eligibility filter so the report reflects who is actually rated.
	const reportable = tournament.registrations.filter(
		(registration) =>
			!registrationNeedsEligibilityReview(registration) &&
			registration.eligibilityReviewStatus !== EligibilityReviewStatus.REJECTED
	);

	const sections = tournament.sections.map((section) => {
		const registrations = reportable
			.filter((registration) => registration.sectionId === section.id)
			.map((registration) => ({
				id: registration.id,
				seedRating: registration.seedRating,
				player: registration.player
			}));

		const rounds = tournament.rounds
			.filter((round) => round.sectionId === section.id)
			.map((round) => ({ number: round.number, pairings: round.pairings }));

		return {
			name: section.name,
			crosstable: buildSectionCrosstable(registrations, rounds)
		};
	});

	return {
		tournament: {
			name: tournament.name,
			organizationName: tournament.organizationName,
			location: tournament.location,
			startDate: tournament.startDate,
			endDate: tournament.endDate,
			timeControl: tournament.timeControl,
			totalRounds: tournament.totalRounds,
			isRated: tournament.isRated,
			affiliateName: tournament.affiliateName,
			slug: tournament.slug
		},
		sections
	};
}
