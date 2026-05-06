import { error } from '@sveltejs/kit';
import {
	addSection,
	addWalkIn,
	approveRegistration,
	closeRegistration,
	completeTournament,
	generateNextRound,
	getTournamentBySlug,
	publishTournament,
	rejectRegistration,
	reopenRegistration,
	requestBye,
	resumeTournament,
	returnToRegistrationClosed,
	saveResults,
	startTournament,
	standingsFor,
	unpublishTournament,
	updateSection,
	updateTournament
} from '$lib/server/tournament-service';

export async function load({ params }) {
	const tournament = await getTournamentBySlug(params.slug);

	if (!tournament) {
		throw error(404, 'Tournament not found');
	}

	return {
		tournament,
		standings: standingsFor(tournament)
	};
}

export const actions = {
	updateTournament: async ({ params, request }) => updateTournament(params.slug, await request.formData()),
	addSection: async ({ params, request }) => addSection(params.slug, await request.formData()),
	updateSection: async ({ params, request }) => updateSection(params.slug, await request.formData()),
	publish: async ({ params }) => publishTournament(params.slug),
	unpublish: async ({ params }) => unpublishTournament(params.slug),
	closeRegistration: async ({ params }) => closeRegistration(params.slug),
	reopenRegistration: async ({ params }) => reopenRegistration(params.slug),
	start: async ({ params }) => startTournament(params.slug),
	returnToRegistrationClosed: async ({ params }) => returnToRegistrationClosed(params.slug),
	complete: async ({ params }) => completeTournament(params.slug),
	resume: async ({ params }) => resumeTournament(params.slug),
	addWalkIn: async ({ params, request }) => addWalkIn(params.slug, await request.formData()),
	approveRegistration: async ({ params, request }) => approveRegistration(params.slug, await request.formData()),
	rejectRegistration: async ({ params, request }) => rejectRegistration(params.slug, await request.formData()),
	requestBye: async ({ params, request }) => requestBye(params.slug, await request.formData()),
	generateRound: async ({ params }) => generateNextRound(params.slug),
	saveResults: async ({ request }) => saveResults(await request.formData())
};
