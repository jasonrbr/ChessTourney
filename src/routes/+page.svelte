<script lang="ts">
	const milestones = [
		'Organization-side tournament management',
		'Draft and published visibility boundaries',
		'Affiliate validation for rated events',
		'Registration and payments added in later slices'
	];
</script>

<svelte:head>
	<title>ChessTourney</title>
	<meta
		name="description"
		content="ChessTourney is a tournament management app for over-the-board events with organization-side tools and public tournament discovery."
	/>
</svelte:head>

<section class="hero">
	<div>
		<p class="eyebrow">Milestone 1</p>
		<h1>Manage tournaments first, add payments later.</h1>
		<p class="lede">
			The first implementation slice focuses on organization access, tournament setup, section
			configuration, and publication flow before registration, Stripe, and notification providers
			are added.
		</p>
		<div class="actions">
			<a class="primary" href="/org/tournaments">Open tournament workspace</a>
			<a class="secondary" href="/org/tournaments/new">Create a draft tournament</a>
		</div>
	</div>

	<aside class="panel">
		<h2>Current implementation goals</h2>
		<ul>
			{#each milestones as milestone}
				<li>{milestone}</li>
			{/each}
		</ul>
	</aside>
</section>

<section class="summary-grid">
	<article>
		<h2>Public side stays simple</h2>
		<p>
			Published tournaments should be discoverable and readable without exposing draft operational
			data or requiring players to understand the organization model.
		</p>
	</article>

	<article>
		<h2>Organization workflows stay explicit</h2>
		<p>
			Tournament configuration, affiliate enforcement, section setup, and publication controls all
			live in org-side routes so later permission checks have a clear home.
		</p>
	</article>

	<article>
		<h2>Payment boundaries remain intact</h2>
		<p>
			This slice intentionally defers online payments while preserving separate payment concepts so
			Stripe can be added later without rewriting registration flows.
		</p>
	</article>
</section>

<style>
	.hero {
		display: grid;
		gap: 1.5rem;
		align-items: start;
	}

	.eyebrow {
		margin: 0 0 0.75rem;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #8f5d2f;
	}

	h1 {
		margin: 0;
		font-size: clamp(2.4rem, 5vw, 4.4rem);
		line-height: 1;
		max-width: 11ch;
	}

	.lede {
		max-width: 65ch;
		font-size: 1.05rem;
		line-height: 1.7;
		color: #4c5d63;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	.primary,
	.secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.9rem 1.2rem;
		border-radius: 999px;
		font-weight: 700;
		text-decoration: none;
	}

	.primary {
		background: #1d3b39;
		color: #f7f4ea;
	}

	.secondary {
		border: 1px solid #c4d1ce;
		color: #1d3b39;
		background: rgba(255, 255, 255, 0.75);
	}

	.panel {
		padding: 1.25rem;
		border-radius: 1.25rem;
		background: #fffdfa;
		border: 1px solid #eadfcb;
		box-shadow: 0 18px 50px rgba(64, 47, 23, 0.08);
	}

	.panel h2 {
		margin-top: 0;
		font-size: 1rem;
	}

	.panel ul {
		margin: 0;
		padding-left: 1.1rem;
		color: #4c5d63;
		line-height: 1.7;
	}

	.summary-grid {
		display: grid;
		gap: 1rem;
		margin-top: 2.25rem;
	}

	.summary-grid article {
		padding: 1.25rem;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.72);
		border: 1px solid #d8e0de;
	}

	.summary-grid h2 {
		margin-top: 0;
		font-size: 1.1rem;
	}

	.summary-grid p {
		margin-bottom: 0;
		color: #51646a;
		line-height: 1.7;
	}

	@media (min-width: 900px) {
		.hero {
			grid-template-columns: minmax(0, 1.6fr) minmax(290px, 0.9fr);
		}

		.summary-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
