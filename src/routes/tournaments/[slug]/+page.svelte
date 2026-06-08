<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const scoreLabel = (scoreUnits: number | null | undefined) =>
		scoreUnits == null ? '' : String(scoreUnits / 2).replace('.5', '.5');
	const playerName = (registration: { player: { firstName: string; lastName: string } }) =>
		`${registration.player.firstName} ${registration.player.lastName}`;
	const formatDate = (value: Date | string) =>
		new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
			new Date(value)
		);
	const sectionName = (sectionId: string) =>
		data.tournament.sections.find((section) => section.id === sectionId)?.name ?? 'Section';
	const currentRoundNumber = $derived(data.tournament.rounds.at(-1)?.number ?? 0);
	const currentRounds = $derived(
		data.tournament.rounds.filter((round) => round.number === currentRoundNumber)
	);
	const publicRegistrations = $derived(
		data.tournament.registrations.filter((registration) => registration.status === 'REGISTERED')
	);
	const registrationStatus = (registration: { eligibilityReviewStatus: string }) =>
		registration.eligibilityReviewStatus === 'PENDING' ? 'Pending TD review' : 'Registered';
</script>

<svelte:head>
	<title>{data.tournament.name} | ChessTourney</title>
</svelte:head>

<section class="page">
	<header class="hero">
		<div>
			<h1>{data.tournament.name}</h1>
			<p>{data.tournament.organizationName} · {data.tournament.location} · {formatDate(data.tournament.startDate)}</p>
		</div>
		{#if data.registrationOpen}
			<a href={`/tournaments/${data.tournament.slug}/register`}>Register</a>
		{:else}
			<span class="closed">Registration closed</span>
		{/if}
	</header>

	{#if data.registered}
		<p class="success">Registration received.</p>
	{/if}

	<section class="grid">
		<article class="card">
			<h2>Event</h2>
			<dl>
				<div><dt>Format</dt><dd>Double Round Swiss</dd></div>
				<div><dt>Time control</dt><dd>{data.tournament.timeControl}</dd></div>
				<div><dt>Rounds</dt><dd>{data.tournament.totalRounds}</dd></div>
				<div><dt>Players</dt><dd>{publicRegistrations.length}</dd></div>
			</dl>
		</article>

		<article class="card">
			<h2>Registrations</h2>
			<div class="rows">
				{#each publicRegistrations as registration}
					<div class="registration-row">
						<strong>{playerName(registration)}</strong>
						<span>{registrationStatus(registration)}</span>
						<small>{sectionName(registration.sectionId)} · {registration.seedRating ?? 'Unrated'}</small>
					</div>
				{/each}
			</div>
		</article>

		<article class="card">
			<h2>Standings</h2>
			<div class="rows">
				{#each data.standings as row, index}
					<div class="row">
						<span>{index + 1}</span>
						<strong>{playerName(row.registration)}</strong>
						<span>{scoreLabel(row.pointsUnits)} pts</span>
						<small>{sectionName(row.registration.sectionId)}</small>
					</div>
				{/each}
			</div>
		</article>
	</section>

	{#if currentRounds.length > 0}
		<section class="card">
			<h2>Round {currentRoundNumber} Pairings</h2>
			<div class="rows">
				{#each currentRounds as round}
					<h3>{sectionName(round.sectionId)}</h3>
					{#each round.pairings as pairing}
						{#if pairing.pairingType === 'BYE' && pairing.byeRegistration}
							<div class="pairing">
								<span>Board {pairing.boardNumber}</span>
								<strong>{playerName(pairing.byeRegistration)}</strong>
								<span>{pairing.byeType === 'REQUESTED' ? 'Requested bye' : 'Pairing bye'} · {scoreLabel(pairing.byeScoreUnits)} pts</span>
							</div>
						{:else if pairing.pairingType === 'GAME'}
							{@const game1 = pairing.games.find((g) => g.gameNumber === 1)}
							{#if game1}
								<div class="pairing">
									<span>Board {pairing.boardNumber}</span>
									<strong>{playerName(game1.whiteRegistration)}</strong>
									<span>White first vs</span>
									<strong>{playerName(game1.blackRegistration)}</strong>
								</div>
							{/if}
						{/if}
					{/each}
				{/each}
			</div>
		</section>
	{/if}
</section>

<style>
	.page,
	.grid,
	.rows {
		display: grid;
		gap: 1rem;
	}

	.hero,
	.card,
	.success {
		padding: 1.1rem;
		border-radius: 0.9rem;
		background: rgba(255, 255, 255, 0.86);
		border: 1px solid #d9e2df;
	}

	.hero {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: start;
		justify-content: space-between;
	}

	h1,
	h2 {
		margin: 0;
	}

	.hero p {
		color: #52646a;
	}

	.hero a {
		padding: 0.75rem 1rem;
		border-radius: 999px;
		background: #1d3b39;
		color: #f7f4ea;
		text-decoration: none;
		font-weight: 800;
	}

	.closed {
		padding: 0.75rem 1rem;
		border-radius: 999px;
		background: #dbe5e2;
		color: #1d3b39;
		font-weight: 800;
	}

	.success {
		background: #eef5f3;
		color: #27584f;
		font-weight: 800;
	}

	dl {
		display: grid;
		gap: 0.55rem;
		margin: 1rem 0 0;
	}

	dl div,
	.row,
	.registration-row,
	.pairing {
		display: grid;
		gap: 0.4rem;
		padding-top: 0.65rem;
		border-top: 1px solid #e3e8e6;
	}

	dl div,
	.row,
	.registration-row {
		grid-template-columns: minmax(0, 1fr) auto;
	}

	.row span:first-child {
		grid-column: 1 / -1;
		color: #8f5d2f;
		font-weight: 900;
	}

	.row small,
	.registration-row small {
		grid-column: 1 / -1;
		color: #607177;
	}

	dt {
		font-weight: 800;
		color: #607177;
	}

	dd {
		margin: 0;
	}

	@media (min-width: 860px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
