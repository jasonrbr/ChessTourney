<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const unratedPolicyLabel = (value: string) =>
		({
			ALLOWED: 'unrated allowed',
			BLOCKED: 'unrated not eligible',
			TD_REVIEW: 'unrated by TD review'
		})[value] ?? value;
	const sectionEligibility = (section: {
		minRating: number | null;
		maxRating: number | null;
		unratedPolicy: string;
	}) => {
		const rating =
			section.minRating != null && section.maxRating != null
				? `${section.minRating}-${section.maxRating}`
				: section.minRating != null
					? `${section.minRating}+`
					: section.maxRating != null
						? `up to ${section.maxRating}`
						: 'open rating';

		return `${rating}, ${unratedPolicyLabel(section.unratedPolicy)}`;
	};
</script>

<svelte:head>
	<title>Register | {data.tournament.name}</title>
</svelte:head>

<section class="page">
	<header>
		<h1>Register for {data.tournament.name}</h1>
		<p>Double Round Swiss · {data.tournament.timeControl}</p>
	</header>

	{#if data.registrationOpen}
		<form method="POST" class="form">
			<label>
				<span>First name</span>
				<input name="firstName" required autocomplete="given-name" />
			</label>

			<label>
				<span>Last name</span>
				<input name="lastName" required autocomplete="family-name" />
			</label>

			<label>
				<span>Email</span>
				<input name="email" type="email" autocomplete="email" />
			</label>

			<label>
				<span>Rating</span>
				<input name="rating" inputmode="numeric" placeholder="Optional" />
			</label>

			<label>
				<span>Section</span>
				<select name="sectionId">
					{#each data.tournament.sections as section}
						<option value={section.id}>{section.name} ({sectionEligibility(section)})</option>
					{/each}
				</select>
			</label>

			<button>Register</button>
		</form>
	{:else}
		<section class="closed">
			<h2>Registration closed</h2>
			<a href={`/tournaments/${data.tournament.slug}`}>View tournament</a>
		</section>
	{/if}
</section>

<style>
	.page {
		display: grid;
		gap: 1rem;
		max-width: 680px;
	}

	h1 {
		margin: 0;
	}

	header p {
		color: #52646a;
	}

	.form,
	.closed {
		display: grid;
		gap: 1rem;
		padding: 1.1rem;
		border-radius: 0.9rem;
		background: rgba(255, 255, 255, 0.86);
		border: 1px solid #d9e2df;
	}

	.closed h2 {
		margin: 0;
	}

	.closed a {
		justify-self: start;
		color: #1d3b39;
		font-weight: 800;
	}

	label {
		display: grid;
		gap: 0.4rem;
		font-weight: 800;
	}

	input,
	select {
		padding: 0.8rem;
		border: 1px solid #c8d4d1;
		border-radius: 0.7rem;
		font: inherit;
	}

	button {
		justify-self: start;
		padding: 0.8rem 1.1rem;
		border: 0;
		border-radius: 999px;
		background: #1d3b39;
		color: #f7f4ea;
		font: inherit;
		font-weight: 800;
	}
</style>
