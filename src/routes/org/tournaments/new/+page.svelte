<svelte:head>
	<title>Create Tournament | ChessTourney</title>
</svelte:head>

<script lang="ts">
	const sectionExamples = ['Open', 'Under 1800', 'Under 1400'];
</script>

<section class="page">
	<header>
		<h2>Create a draft tournament</h2>
		<p>Set up tournament details, rating context, sections, and publication readiness.</p>
	</header>

	<form class="form">
		<div class="grid">
			<label>
				<span>Tournament name</span>
				<input name="name" placeholder="Spring Open 2026" />
			</label>

			<label>
				<span>Organization</span>
				<select name="organization">
					<option>Cleveland Chess Club</option>
					<option>North Coast Scholastic Chess</option>
				</select>
			</label>

			<label>
				<span>Start date</span>
				<input type="date" name="startDate" />
			</label>

			<label>
				<span>End date</span>
				<input type="date" name="endDate" />
			</label>

			<label>
				<span>Format family</span>
				<select name="format">
					<option>Swiss</option>
					<option>Round Robin</option>
					<option>Team</option>
				</select>
			</label>

			<label>
				<span>Location</span>
				<input name="location" placeholder="Cleveland, OH" />
			</label>
		</div>

		<fieldset>
			<legend>Rating context</legend>
			<label class="checkbox">
				<input type="checkbox" name="isRated" checked />
				<span>USCF-rated event</span>
			</label>
			<label class="checkbox">
				<input type="checkbox" name="isFideRated" />
				<span>Also FIDE-rated</span>
			</label>
			<label>
				<span>Affiliate</span>
				<select name="affiliate">
					<option>Cleveland Chess Club USCF Affiliate</option>
					<option>North Coast Scholastic Affiliate</option>
				</select>
			</label>
			<p class="hint">Rated events need exactly one affiliate before they can be published.</p>
		</fieldset>

		<fieldset>
			<legend>Sections</legend>
			<ul class="section-list">
				{#each sectionExamples as section}
					<li>{section}</li>
				{/each}
			</ul>
		</fieldset>

		<fieldset>
			<legend>Operations</legend>
			<label class="checkbox">
				<input type="checkbox" name="checkInEnabled" checked />
				<span>Enable staff-managed check-in</span>
			</label>
			<label>
				<span>Payment mode</span>
				<select name="paymentMode">
					<option>Deferred</option>
					<option>Offline only</option>
					<option>Hosted online later</option>
				</select>
			</label>
		</fieldset>

		<div class="actions">
			<button type="button">Save draft</button>
			<button type="button" class="secondary">Validate for publication</button>
		</div>
	</form>
</section>

<style>
	.page {
		display: grid;
		gap: 1rem;
	}

	header h2 {
		margin: 0;
	}

	header p {
		max-width: 68ch;
		color: #52646a;
	}

	.form {
		display: grid;
		gap: 1rem;
		padding: 1.2rem;
		border-radius: 1.1rem;
		background: rgba(255, 255, 255, 0.84);
		border: 1px solid #d7dfdd;
	}

	.grid {
		display: grid;
		gap: 1rem;
	}

	label,
	fieldset {
		display: grid;
		gap: 0.45rem;
	}

	label span,
	legend {
		font-weight: 700;
		color: #1d3537;
	}

	input,
	select {
		padding: 0.8rem 0.9rem;
		border: 1px solid #c8d4d1;
		border-radius: 0.8rem;
		background: #fffcf6;
		font: inherit;
	}

	fieldset {
		padding: 1rem;
		border: 1px solid #dfe6e4;
		border-radius: 1rem;
	}

	.checkbox {
		grid-template-columns: auto 1fr;
		align-items: center;
	}

	.checkbox input {
		margin: 0;
	}

	.hint {
		margin: 0;
		color: #61737a;
		font-size: 0.95rem;
	}

	.section-list {
		margin: 0;
		padding-left: 1.1rem;
		color: #20363a;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	button {
		padding: 0.85rem 1.1rem;
		border: 0;
		border-radius: 999px;
		background: #1d3b39;
		color: #f7f4ea;
		font: inherit;
		font-weight: 700;
	}

	button.secondary {
		background: #d8e3df;
		color: #1d3b39;
	}

	@media (min-width: 800px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
