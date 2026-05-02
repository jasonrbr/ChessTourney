import { createTournament } from '$lib/server/tournament-service';

export const actions = {
	default: async ({ request }) => createTournament(await request.formData())
};
