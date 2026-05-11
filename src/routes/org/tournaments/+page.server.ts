import { listTournaments } from '$lib/server/tournaments';

export async function load() {
	return {
		tournaments: await listTournaments()
	};
}
