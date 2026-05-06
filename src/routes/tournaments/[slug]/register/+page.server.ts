import { error } from '@sveltejs/kit';
import {
	getTournamentBySlug,
	registerPlayer,
	registrationIsOpen
} from '$lib/server/tournament-service';

export async function load({ params }) {
	const tournament = await getTournamentBySlug(params.slug);

	if (!tournament || tournament.visibility !== 'PUBLISHED') {
		throw error(404, 'Tournament not found');
	}

	return { tournament, registrationOpen: registrationIsOpen(tournament) };
}

export const actions = {
	default: async ({ params, request }) => registerPlayer(params.slug, await request.formData())
};
