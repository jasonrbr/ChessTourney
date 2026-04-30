<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const navItems = [
		{ href: '/org/tournaments', label: 'Tournaments' },
		{ href: '/org/tournaments/new', label: 'Create draft' }
	];
</script>

<div class="workspace">
	<header class="workspace-header">
		<div>
			<p class="eyebrow">Organization workspace</p>
			<h1>Tournament operations</h1>
			<p>
				Starting with configuration, sections, visibility, and affiliate-aware publication
				workflows.
			</p>
		</div>

		<nav aria-label="Organization workspace">
			<ul>
				{#each navItems as item}
					<li>
						<a class:active={page.url.pathname === item.href} href={item.href}>{item.label}</a>
					</li>
				{/each}
			</ul>
		</nav>
	</header>

	<div class="workspace-body">
		{@render children()}
	</div>
</div>

<style>
	.workspace {
		display: grid;
		gap: 1.5rem;
	}

	.workspace-header {
		display: grid;
		gap: 1rem;
		padding: 1.3rem;
		border-radius: 1.25rem;
		background: linear-gradient(135deg, #1d3b39 0%, #335d57 100%);
		color: #f6f2e7;
	}

	.workspace-header h1 {
		margin: 0;
		font-size: clamp(1.8rem, 4vw, 2.7rem);
	}

	.workspace-header p {
		max-width: 58ch;
		color: rgba(246, 242, 231, 0.82);
	}

	.eyebrow {
		margin: 0 0 0.5rem;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #f3c58f;
	}

	nav ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		padding: 0;
		margin: 0;
		list-style: none;
	}

	nav a {
		display: inline-flex;
		padding: 0.65rem 0.95rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.12);
		color: #f6f2e7;
		text-decoration: none;
		font-weight: 600;
	}

	nav a.active {
		background: #f6f2e7;
		color: #1d3b39;
	}
	.workspace-body {
		display: grid;
		gap: 1.25rem;
	}
	@media (min-width: 900px) {
		.workspace-header {
			grid-template-columns: minmax(0, 1.6fr) auto;
			align-items: end;
		}
	}
</style>
