<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const formatDate = (value: Date | string) =>
		new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
			new Date(value)
		);
</script>

<svelte:head>
	<title>Tournaments | ChessTourney</title>
</svelte:head>

<section class="toolbar">
	<div>
		<h1>Tournaments</h1>
		<p>Register for published over-the-board events.</p>
	</div>
</section>

<section class="grid">
	{#each data.tournaments as tournament}
		<article class="card">
			<h2><a href={`/tournaments/${tournament.slug}`}>{tournament.name}</a></h2>
			<p>{tournament.organizationName} · {tournament.location}</p>
			<dl>
				<div><dt>Date</dt><dd>{formatDate(tournament.startDate)}</dd></div>
				<div><dt>Format</dt><dd>Double Round Swiss</dd></div>
				<div><dt>Time control</dt><dd>{tournament.timeControl}</dd></div>
				<div><dt>Players</dt><dd>{tournament.registrations.length}</dd></div>
			</dl>
			{#if tournament.status === 'SETUP' || tournament.status === 'REGISTRATION_OPEN'}
				<a class="button" href={`/tournaments/${tournament.slug}/register`}>Register</a>
			{:else}
				<a class="button secondary" href={`/tournaments/${tournament.slug}`}>View details</a>
			{/if}
		</article>
	{/each}
</section>

<style>
	.toolbar h1,
	h2 {
		margin: 0;
	}

	.toolbar p,
	.card p {
		color: #52646a;
	}

	.grid {
		display: grid;
		gap: 1rem;
	}

	.card {
		display: grid;
		gap: 0.8rem;
		padding: 1.1rem;
		border-radius: 0.9rem;
		background: rgba(255, 255, 255, 0.86);
		border: 1px solid #d9e2df;
	}

	.card a {
		text-decoration: none;
	}

	dl {
		display: grid;
		gap: 0.55rem;
		margin: 0;
	}

	dl div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding-top: 0.55rem;
		border-top: 1px solid #e3e8e6;
	}

	dt {
		font-weight: 800;
		color: #607177;
	}

	dd {
		margin: 0;
	}

	.button {
		justify-self: start;
		padding: 0.75rem 1rem;
		border-radius: 999px;
		background: #1d3b39;
		color: #f7f4ea;
		font-weight: 800;
	}

	.button.secondary {
		background: transparent;
		color: #1d3b39;
		border: 1.5px solid #1d3b39;
	}

	@media (min-width: 900px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
