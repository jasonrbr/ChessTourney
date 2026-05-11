import { createTournament } from '$lib/server/tournaments';

export const actions = {
	default: async ({ request }) => createTournament(await request.formData())
};
