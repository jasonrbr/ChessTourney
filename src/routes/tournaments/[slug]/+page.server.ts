import { error } from '@sveltejs/kit';
import { TournamentVisibility } from '@prisma/client';
import {
	getTournamentForPublic,
	registrationIsOpen,
	standingsFor
} from '$lib/server/tournaments';

export async function load({ params, url }) {
	const tournament = await getTournamentForPublic(params.slug);

	if (!tournament || tournament.visibility !== TournamentVisibility.PUBLISHED) {
		throw error(404, 'Tournament not found');
	}

	return {
		tournament,
		registrationOpen: registrationIsOpen(tournament),
		standings: standingsFor(tournament),
		registered: url.searchParams.get('registered') === '1'
	};
}
