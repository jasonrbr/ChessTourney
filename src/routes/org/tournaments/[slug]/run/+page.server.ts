import { error } from '@sveltejs/kit';
import {
	closeRegistration,
	completeTournament,
	getTournamentWorkspace,
	reopenRegistration,
	resumeTournament,
	returnToRegistrationClosed,
	standingsFor,
	startTournament
} from '$lib/server/tournaments';
import { addWalkIn, approveRegistration, rejectRegistration } from '$lib/server/registrations';
import { generateNextRound, regenerateCurrentRound, requestBye, saveResults } from '$lib/server/pairings';

export async function load({ params }) {
	const tournament = await getTournamentWorkspace(params.slug);

	if (!tournament) {
		throw error(404, 'Tournament not found');
	}

	return {
		tournament,
		standings: standingsFor(tournament)
	};
}

export const actions = {
	closeRegistration: async ({ params }) => closeRegistration(params.slug),
	reopenRegistration: async ({ params }) => reopenRegistration(params.slug),
	start: async ({ params }) => startTournament(params.slug),
	returnToRegistrationClosed: async ({ params }) => returnToRegistrationClosed(params.slug),
	complete: async ({ params }) => completeTournament(params.slug),
	resume: async ({ params }) => resumeTournament(params.slug),
	addWalkIn: async ({ params, request }) => addWalkIn(params.slug, await request.formData()),
	approveRegistration: async ({ params, request }) =>
		approveRegistration(params.slug, await request.formData()),
	rejectRegistration: async ({ params, request }) =>
		rejectRegistration(params.slug, await request.formData()),
	requestBye: async ({ params, request }) => requestBye(params.slug, await request.formData()),
	generateRound: async ({ params }) => generateNextRound(params.slug),
	saveResults: async ({ request }) => saveResults(await request.formData()),
	regenerateCurrentRound: async ({ params }) => regenerateCurrentRound(params.slug)
};
