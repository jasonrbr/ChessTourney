<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const formatDate = (value: string) =>
		new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(`${value}T00:00:00`));
</script>

<svelte:head>
	<title>Organization Tournaments | ChessTourney</title>
</svelte:head>

<section class="toolbar">
	<div>
		<h2>All tournaments</h2>
		<p>Drafts stay private. Published events become visible on the public side.</p>
	</div>
	<a href="/org/tournaments/new">Create tournament</a>
</section>

<section class="grid">
	{#each data.tournaments as tournament}
		<article class="card">
			<div class="topline">
				<span class:published={tournament.visibility === 'published'}>{tournament.visibility}</span>
				<span>{tournament.format}</span>
			</div>

			<div class="title-row">
				<div>
					<h3><a href={`/org/tournaments/${tournament.slug}`}>{tournament.name}</a></h3>
					<p>{tournament.organizationName} · {tournament.location}</p>
				</div>
			</div>

			<dl class="meta">
				<div>
					<dt>Dates</dt>
					<dd>{formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}</dd>
				</div>
				<div>
					<dt>Affiliate</dt>
					<dd>{tournament.affiliateName ?? 'Not required yet'}</dd>
				</div>
				<div>
					<dt>Sections</dt>
					<dd>{tournament.sections.length}</dd>
				</div>
				<div>
					<dt>Payment</dt>
					<dd>{tournament.paymentMode}</dd>
				</div>
			</dl>

			{#if tournament.isRated && !tournament.affiliateName}
				<p class="warning">Rated tournaments need exactly one affiliate before publication.</p>
			{/if}
		</article>
	{/each}
</section>

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: end;
		justify-content: space-between;
	}

	.toolbar h2 {
		margin: 0;
	}

	.toolbar p {
		margin: 0.3rem 0 0;
		color: #52646a;
	}

	.toolbar a {
		display: inline-flex;
		padding: 0.8rem 1rem;
		border-radius: 999px;
		background: #8f5d2f;
		color: #fff9f0;
		text-decoration: none;
		font-weight: 700;
	}

	.grid {
		display: grid;
		gap: 1rem;
	}

	.card {
		padding: 1.2rem;
		border-radius: 1.1rem;
		background: rgba(255, 255, 255, 0.82);
		border: 1px solid #d5dfdc;
		box-shadow: 0 14px 36px rgba(40, 56, 54, 0.07);
	}

	.topline {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1rem;
		font-size: 0.82rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #66757b;
	}

	.topline .published {
		color: #27584f;
	}

	.title-row h3 {
		margin: 0;
		font-size: 1.25rem;
	}

	.title-row a {
		color: #193235;
		text-decoration: none;
	}

	.title-row p {
		margin: 0.35rem 0 0;
		color: #52646a;
	}

	.meta {
		display: grid;
		gap: 0.8rem;
		margin: 1rem 0 0;
	}

	.meta div {
		padding-top: 0.8rem;
		border-top: 1px solid #e3e8e6;
	}

	dt {
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #6d7b80;
	}

	dd {
		margin: 0.25rem 0 0;
		color: #20363a;
	}

	.warning {
		margin: 1rem 0 0;
		padding: 0.8rem 0.9rem;
		border-radius: 0.8rem;
		background: #fff3dd;
		color: #7d4c10;
	}

	@media (min-width: 900px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
