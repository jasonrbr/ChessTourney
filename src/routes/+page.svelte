<svelte:head>
	<title>ChessTourney</title>
	<meta
		name="description"
		content="ChessTourney helps organizers manage over-the-board chess tournaments."
	/>
</svelte:head>

<section class="home">
	<header>
		<p class="eyebrow">ChessTourney</p>
		<h1>Tournament management</h1>
	</header>

	<nav class="actions" aria-label="Main actions">
		<a class="primary" href="/org/tournaments">Open tournament workspace</a>
		<a class="secondary" href="/org/tournaments/new">Create tournament</a>
	</nav>
</section>

<style>
	.home {
		display: grid;
		gap: 1.5rem;
		align-content: center;
		min-height: calc(100vh - 9rem);
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
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
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
</style>
