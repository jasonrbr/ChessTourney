<script lang="ts">
	function syncDefaultUnratedPolicy(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const select = input.form?.querySelector<HTMLSelectElement>('select[name="unratedPolicy"]');
		if (!select || select.dataset.touched === 'true') return;

		select.value = input.value.trim() ? 'TD_REVIEW' : 'ALLOWED';
	}

	function markUnratedPolicyTouched(event: Event) {
		(event.currentTarget as HTMLSelectElement).dataset.touched = 'true';
	}
</script>

<svelte:head>
	<title>Create Tournament | ChessTourney</title>
</svelte:head>

<section class="page">
	<header>
		<h2>Create a tournament</h2>
		<p>Set up a Blitz Double Round Swiss event with public registration.</p>
	</header>

	<form class="form" method="POST">
		<div class="grid">
			<label>
				<span>Tournament name</span>
				<input name="name" placeholder="Friday Night Blitz" required />
			</label>

			<label>
				<span>Organization</span>
				<input name="organizationName" placeholder="Michigan Chess Club" />
			</label>

			<label>
				<span>Start date</span>
				<input type="date" name="startDate" required />
			</label>

			<label>
				<span>End date</span>
				<input type="date" name="endDate" />
			</label>

			<label>
				<span>Location</span>
				<input name="location" placeholder="Ann Arbor, MI" required />
			</label>

			<label>
				<span>Section</span>
				<input name="sectionName" value="Open" />
			</label>

			<label>
				<span>Minimum rating</span>
				<input name="minRating" inputmode="numeric" placeholder="Optional" oninput={syncDefaultUnratedPolicy} />
			</label>

			<label>
				<span>Maximum rating</span>
				<input name="maxRating" inputmode="numeric" placeholder="Optional" />
			</label>

			<label>
				<span>Unrated players</span>
				<select name="unratedPolicy" onchange={markUnratedPolicyTouched}>
					<option value="ALLOWED">Allowed</option>
					<option value="TD_REVIEW">TD review</option>
					<option value="BLOCKED">Not eligible</option>
				</select>
			</label>

			<label>
				<span>Format</span>
				<input value="Double Round Swiss" disabled />
			</label>

			<label>
				<span>Time control</span>
				<input name="timeControl" value="5+0" />
			</label>

			<label>
				<span>Rounds</span>
				<input type="number" min="1" max="12" name="totalRounds" value="4" />
			</label>

			<label>
				<span>Pairing bye score</span>
				<input name="pairingByeScore" inputmode="decimal" value="2" />
			</label>

			<label>
				<span>Requested bye score</span>
				<input name="requestedByeScore" inputmode="decimal" value="1" />
			</label>

			<label>
				<span>USCF affiliate</span>
				<input name="affiliateName" placeholder="Michigan Chess Club USCF Affiliate" />
			</label>
		</div>

		<label class="checkbox">
			<input type="checkbox" name="isRated" checked />
			<span>USCF-rated event</span>
		</label>

		<div class="actions">
			<button>Create tournament</button>
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

	label {
		display: grid;
		gap: 0.45rem;
	}

	label span {
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

	input:disabled {
		color: #4b5d62;
	}

	.checkbox {
		grid-template-columns: auto 1fr;
		align-items: center;
	}

	.checkbox input {
		margin: 0;
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

	@media (min-width: 800px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
