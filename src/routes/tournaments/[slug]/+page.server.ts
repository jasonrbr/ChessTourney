import { error } from '@sveltejs/kit';
import {
	getTournamentBySlug,
	registrationIsOpen,
	standingsFor
} from '$lib/server/tournament-service';

export async function load({ params, url }) {
	const tournament = await getTournamentBySlug(params.slug);

	if (!tournament || tournament.visibility !== 'PUBLISHED') {
		throw error(404, 'Tournament not found');
	}

	return {
		tournament,
		registrationOpen: registrationIsOpen(tournament),
		standings: standingsFor(tournament),
		registered: url.searchParams.get('registered') === '1'
	};
}
