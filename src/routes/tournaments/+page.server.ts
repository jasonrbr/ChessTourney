import { listPublishedTournaments } from '$lib/server/tournament-service';

export async function load() {
	return {
		tournaments: await listPublishedTournaments()
	};
}
