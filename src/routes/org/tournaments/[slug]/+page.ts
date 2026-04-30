import { error } from '@sveltejs/kit';
import { getTournamentBySlug } from '$lib/mock/tournaments';

export function load({ params }) {
	const tournament = getTournamentBySlug(params.slug);

	if (!tournament) {
		throw error(404, 'Tournament not found');
	}

	return {
		tournament
	};
}
