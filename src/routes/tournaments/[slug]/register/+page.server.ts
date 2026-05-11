import { error } from '@sveltejs/kit';
import { TournamentVisibility } from '@prisma/client';
import { getTournamentForRegistration, registrationIsOpen } from '$lib/server/tournaments';
import { registerPlayer } from '$lib/server/registrations';

export async function load({ params }) {
	const tournament = await getTournamentForRegistration(params.slug);

	if (!tournament || tournament.visibility !== TournamentVisibility.PUBLISHED) {
		throw error(404, 'Tournament not found');
	}

	return { tournament, registrationOpen: registrationIsOpen(tournament) };
}

export const actions = {
	default: async ({ params, request }) => registerPlayer(params.slug, await request.formData())
};
