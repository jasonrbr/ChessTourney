import { error } from '@sveltejs/kit';
import {
	addSection,
	getTournamentWorkspace,
	publishTournament,
	removeSection,
	unpublishTournament,
	updateSection,
	updateTournament
} from '$lib/server/tournaments';

export async function load({ params }) {
	const tournament = await getTournamentWorkspace(params.slug);

	if (!tournament) {
		throw error(404, 'Tournament not found');
	}

	return { tournament };
}

export const actions = {
	updateTournament: async ({ params, request }) =>
		updateTournament(params.slug, await request.formData()),
	addSection: async ({ params, request }) => addSection(params.slug, await request.formData()),
	updateSection: async ({ params, request }) => updateSection(params.slug, await request.formData()),
	removeSection: async ({ params, request }) => removeSection(params.slug, await request.formData()),
	publish: async ({ params }) => publishTournament(params.slug),
	unpublish: async ({ params }) => unpublishTournament(params.slug)
};
