<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	const links = [
		{ href: '/', label: 'Home' },
		{ href: '/tournaments', label: 'Public tournaments' },
		{ href: '/org/tournaments', label: 'TD workspace' },
		{ href: '/org/tournaments/new', label: 'Create tournament' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<header class="site-header">
		<a class="brand" href="/">
			<span>ChessTourney</span>
		</a>

		<nav aria-label="Primary navigation">
			<ul>
				{#each links as link}
					<li><a href={link.href}>{link.label}</a></li>
				{/each}
			</ul>
		</nav>
	</header>

	<main>
		{@render children()}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family:
			'Segoe UI', 'Avenir Next', 'Helvetica Neue', sans-serif;
		background:
			radial-gradient(circle at top left, rgba(248, 214, 164, 0.45), transparent 28%),
			linear-gradient(180deg, #f7f3e7 0%, #eef4f2 100%);
		color: #162c2f;
	}

	:global(a) {
		color: inherit;
	}

	:global(a[href]),
	:global(button:not(:disabled)) {
		cursor: pointer;
	}

	:global(button:disabled) {
		cursor: not-allowed;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.app-shell {
		min-height: 100vh;
	}

	.site-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem clamp(1rem, 3vw, 2rem);
		border-bottom: 1px solid rgba(29, 59, 57, 0.08);
		background: rgba(250, 247, 239, 0.9);
		backdrop-filter: blur(14px);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.brand {
		display: inline-flex;
		text-decoration: none;
		font-weight: 800;
	}

	.brand span {
		font-size: 1.1rem;
	}

	nav ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.9rem;
		padding: 0;
		margin: 0;
		list-style: none;
	}

	nav a {
		text-decoration: none;
		font-weight: 600;
		color: #29494e;
	}

	main {
		width: min(1180px, calc(100% - 2rem));
		margin: 0 auto;
		padding: 1.5rem 0 3rem;
	}
	@media (max-width: 640px) {
		main {
			width: min(1180px, calc(100% - 1rem));
		}
	}
</style>
