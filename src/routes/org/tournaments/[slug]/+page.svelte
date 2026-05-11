<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData, SubmitFunction } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const actionMessage = $derived(form && 'message' in form ? form.message : null);

	const statusLabel = (value: string) => value.replaceAll('_', ' ').toLowerCase();
	const playerName = (registration: { player: { firstName: string; lastName: string } }) =>
		`${registration.player.firstName} ${registration.player.lastName}`;
	const formatDate = (value: Date | string) =>
		new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
			new Date(value)
		);
	const dateInput = (value: Date | string) => new Date(value).toISOString().slice(0, 10);
	const scoreLabel = (scoreUnits: number | null | undefined) =>
		scoreUnits == null ? '' : String(scoreUnits / 2).replace('.5', '.5');
	const unratedPolicyLabel = (value: string) =>
		({
			ALLOWED: 'Unrated allowed',
			BLOCKED: 'Unrated not eligible',
			TD_REVIEW: 'Unrated by TD review'
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
						? `Up to ${section.maxRating}`
						: 'Open rating';

		return `${rating} · ${unratedPolicyLabel(section.unratedPolicy)}`;
	};
	const sectionRegistrationCount = (sectionId: string) =>
		data.tournament.registrations.filter((registration) => registration.sectionId === sectionId)
			.length;
	const sectionRegistrations = (sectionId: string) =>
		data.tournament.registrations.filter((registration) => registration.sectionId === sectionId);
	const otherSections = (sectionId: string) =>
		data.tournament.sections.filter((section) => section.id !== sectionId);
	const sectionHasRounds = (sectionId: string) =>
		data.tournament.rounds.some((round) => round.sectionId === sectionId);

	function syncDefaultUnratedPolicy(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const select = input.form?.querySelector<HTMLSelectElement>('select[name="unratedPolicy"]');
		if (!select || select.dataset.touched === 'true') return;

		select.value = input.value.trim() ? 'TD_REVIEW' : 'ALLOWED';
	}

	function markUnratedPolicyTouched(event: Event) {
		(event.currentTarget as HTMLSelectElement).dataset.touched = 'true';
	}

	function resetUnratedPolicyTouched(event: Event) {
		const select = (event.currentTarget as HTMLFormElement).querySelector<HTMLSelectElement>(
			'select[name="unratedPolicy"]'
		);
		delete select?.dataset.touched;
	}

	const preserveScroll: SubmitFunction = () => {
		const scrollX = window.scrollX;
		const scrollY = window.scrollY;

		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success' || result.type === 'failure') {
				requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
			}
		};
	};

	const preserveScrollAndResetOnSuccess: SubmitFunction = () => {
		const scrollX = window.scrollX;
		const scrollY = window.scrollY;

		return async ({ result, update }) => {
			await update({ reset: result.type === 'success' });
			if (result.type === 'success' || result.type === 'failure') {
				requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
			}
		};
	};
</script>

<svelte:head>
	<title>{data.tournament.name} · Settings | ChessTourney</title>
</svelte:head>

<section class="page">
	<header class="hero">
		<div>
			<p class="status">{statusLabel(data.tournament.status)} · {statusLabel(data.tournament.visibility)}</p>
			<h2>{data.tournament.name}</h2>
			<p>{data.tournament.organizationName} · {data.tournament.location} · {formatDate(data.tournament.startDate)}</p>
		</div>
		<div class="actions">
			<a href={`/org/tournaments/${data.tournament.slug}/run`}>Run tournament</a>
			<a class="secondary" href={`/tournaments/${data.tournament.slug}`}>Public page</a>
			<a class="secondary" href="/org/tournaments">All tournaments</a>
		</div>
	</header>

	{#if actionMessage}
		<p class="form-error" role="alert">{actionMessage}</p>
	{/if}

	<section class="card">
		<div class="section-head">
			<div>
				<h3>Visibility</h3>
				<p>Control whether this tournament appears on the public listing.</p>
			</div>
		</div>
		<div class="button-stack">
			{#if data.tournament.visibility === 'DRAFT'}
				<form method="POST" action="?/publish" use:enhance={preserveScroll}>
					<button>{data.tournament.status === 'SETUP' ? 'Publish registration' : 'Publish'}</button>
				</form>
			{:else}
				<form method="POST" action="?/unpublish" use:enhance={preserveScroll}>
					<button class="secondary">Unpublish</button>
				</form>
			{/if}
		</div>
	</section>

	<section class="card">
		<div class="section-head">
			<div>
				<h3>Tournament settings</h3>
				<p>Edit the details that control registration, pairings, and the public page.</p>
			</div>
		</div>

		<form method="POST" action="?/updateTournament" class="config-form" use:enhance={preserveScroll}>
			<div class="config-grid">
				<label>
					<span>Tournament name</span>
					<input name="name" value={data.tournament.name} required />
				</label>

				<label>
					<span>Organization</span>
					<input name="organizationName" value={data.tournament.organizationName} />
				</label>

				<label>
					<span>Location</span>
					<input name="location" value={data.tournament.location} required />
				</label>

				<label>
					<span>Start date</span>
					<input type="date" name="startDate" value={dateInput(data.tournament.startDate)} required />
				</label>

				<label>
					<span>End date</span>
					<input type="date" name="endDate" value={dateInput(data.tournament.endDate)} />
				</label>

				<label>
					<span>Time control</span>
					<input name="timeControl" value={data.tournament.timeControl} />
				</label>

				<label>
					<span>Rounds</span>
					<input type="number" min="1" max="12" name="totalRounds" value={data.tournament.totalRounds} />
				</label>

				<label>
					<span>Pairing bye score</span>
					<input name="pairingByeScore" inputmode="decimal" value={scoreLabel(data.tournament.pairingByeScore)} />
				</label>

				<label>
					<span>Requested bye score</span>
					<input
						name="requestedByeScore"
						inputmode="decimal"
						value={scoreLabel(data.tournament.requestedByeScore)}
					/>
				</label>

				<label>
					<span>Visibility</span>
					<select name="visibility">
						<option value="DRAFT" selected={data.tournament.visibility === 'DRAFT'}>Draft</option>
						<option value="PUBLISHED" selected={data.tournament.visibility === 'PUBLISHED'}>Published</option>
					</select>
				</label>

				<label>
					<span>Status</span>
					<select name="status">
						<option value="SETUP" selected={data.tournament.status === 'SETUP'}>Setup</option>
						<option value="REGISTRATION_OPEN" selected={data.tournament.status === 'REGISTRATION_OPEN'}>
							Registration open
						</option>
						<option value="REGISTRATION_CLOSED" selected={data.tournament.status === 'REGISTRATION_CLOSED'}>
							Registration closed
						</option>
						<option value="IN_PROGRESS" selected={data.tournament.status === 'IN_PROGRESS'}>In progress</option>
						<option value="COMPLETE" selected={data.tournament.status === 'COMPLETE'}>Complete</option>
					</select>
				</label>

				<label>
					<span>USCF affiliate</span>
					<input name="affiliateName" value={data.tournament.affiliateName ?? ''} />
				</label>
			</div>

			<label class="checkbox">
				<input type="checkbox" name="isRated" checked={data.tournament.isRated} />
				<span>USCF-rated event</span>
			</label>

			<button class="save">Save tournament</button>
		</form>
	</section>

	<section class="card">
		<div class="section-head">
			<div>
				<h3>Sections</h3>
				<p>Configure rating eligibility and add sections before players register.</p>
			</div>
		</div>

		<div class="section-list">
			{#each data.tournament.sections as section}
				<div class="section-editor">
					<form method="POST" action="?/updateSection" class="section-update" use:enhance={preserveScroll}>
						<input type="hidden" name="sectionId" value={section.id} />
						<div>
							<h4>{section.name}</h4>
							<p>{sectionRegistrationCount(section.id)} players · {sectionEligibility(section)}</p>
						</div>

						<div class="section-fields">
							<label>
								<span>Name</span>
								<input name="name" value={section.name} required />
							</label>

							<label>
								<span>Minimum rating</span>
								<input
									name="minRating"
									inputmode="numeric"
									value={section.minRating ?? ''}
									oninput={syncDefaultUnratedPolicy}
								/>
							</label>

							<label>
								<span>Maximum rating</span>
								<input name="maxRating" inputmode="numeric" value={section.maxRating ?? ''} />
							</label>

							<label>
								<span>Unrated players</span>
								<select name="unratedPolicy" onchange={markUnratedPolicyTouched}>
									<option value="ALLOWED" selected={section.unratedPolicy === 'ALLOWED'}>Allowed</option>
									<option value="TD_REVIEW" selected={section.unratedPolicy === 'TD_REVIEW'}>TD review</option>
									<option value="BLOCKED" selected={section.unratedPolicy === 'BLOCKED'}>Not eligible</option>
								</select>
							</label>
						</div>

						<button class="save">Save section</button>
					</form>

					{#if otherSections(section.id).length > 0}
						<details class="remove-section">
							<summary>Remove section</summary>
							{#if sectionHasRounds(section.id)}
								<p class="section-note">Sections with generated rounds cannot be removed.</p>
							{:else}
								<form method="POST" action="?/removeSection" class="remove-section-form" use:enhance={preserveScroll}>
									<input type="hidden" name="sectionId" value={section.id} />

									{#if sectionRegistrations(section.id).length > 0}
										<div class="bulk-move">
											<label>
												<span>Move all registrations to</span>
												<select name="bulkDestinationSectionId">
													{#each otherSections(section.id) as destination}
														<option value={destination.id}>{destination.name}</option>
													{/each}
												</select>
											</label>
											<button name="reassignmentMode" value="bulk">Move all and remove</button>
										</div>

										<div class="player-move-list">
											<h5>Assign individually</h5>
											{#each sectionRegistrations(section.id) as registration}
												<label class="player-move">
													<span>{playerName(registration)} · {registration.seedRating ?? 'Unrated'}</span>
													<select name={`destinationSectionId-${registration.id}`}>
														{#each otherSections(section.id) as destination}
															<option value={destination.id}>{destination.name}</option>
														{/each}
													</select>
												</label>
											{/each}
											<button class="secondary" name="reassignmentMode" value="perRegistration">
												Move selected and remove
											</button>
										</div>
									{:else}
										<button name="reassignmentMode" value="bulk">Remove empty section</button>
									{/if}
								</form>
							{/if}
						</details>
					{/if}
				</div>
			{/each}
		</div>

		<form
			method="POST"
			action="?/addSection"
			class="add-section"
			onreset={resetUnratedPolicyTouched}
			use:enhance={preserveScrollAndResetOnSuccess}
		>
			<h4>Add section</h4>
			<input name="name" placeholder="Reserve" required />
			<input
				name="minRating"
				inputmode="numeric"
				placeholder="Minimum rating"
				oninput={syncDefaultUnratedPolicy}
			/>
			<input name="maxRating" inputmode="numeric" placeholder="Maximum rating" />
			<select name="unratedPolicy" onchange={markUnratedPolicyTouched}>
				<option value="ALLOWED">Allowed</option>
				<option value="TD_REVIEW">TD review</option>
				<option value="BLOCKED">Not eligible</option>
			</select>
			<button>Add section</button>
		</form>
	</section>
</section>

<style>
	.page {
		display: grid;
		gap: 1rem;
	}

	.hero,
	.card {
		padding: 1.1rem;
		border-radius: 0.9rem;
		background: rgba(255, 255, 255, 0.86);
		border: 1px solid #d9e2df;
	}

	.form-error {
		margin: 0;
		padding: 0.9rem 1rem;
		border-radius: 0.75rem;
		background: #fff0ec;
		color: #8a2f20;
		font-weight: 800;
	}

	.hero {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: space-between;
		align-items: start;
	}

	.status {
		margin: 0 0 0.4rem;
		font-size: 0.8rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #8f5d2f;
	}

	h2,
	h3,
	h4 {
		margin: 0;
	}

	.hero p:last-child,
	.section-head p {
		color: #54676d;
	}

	.actions,
	.button-stack {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.button-stack {
		align-items: start;
		margin-top: 0.75rem;
	}

	.actions a,
	button {
		padding: 0.75rem 1rem;
		border: 0;
		border-radius: 999px;
		text-decoration: none;
		font: inherit;
		font-weight: 800;
		background: #1d3b39;
		color: #f7f4ea;
	}

	.actions a,
	button:not(:disabled) {
		cursor: pointer;
	}

	.actions a.secondary,
	button.secondary {
		background: #dbe5e2;
		color: #1d3b39;
	}

	.section-head {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.config-form,
	.config-grid,
	.bulk-move,
	.player-move-list,
	.remove-section-form,
	.section-list,
	.section-fields,
	.section-update {
		display: grid;
		gap: 0.75rem;
	}

	.section-editor {
		display: grid;
		gap: 0.75rem;
		padding: 0.85rem;
		border-radius: 0.75rem;
		background: #fffcf6;
		border: 1px solid #ece3d5;
	}

	.section-editor p {
		margin: 0.25rem 0 0;
		color: #607177;
	}

	.section-update {
		gap: 0.75rem;
	}

	.remove-section {
		padding-top: 0.75rem;
		border-top: 1px solid #ece3d5;
	}

	.remove-section summary {
		cursor: pointer;
		font-weight: 900;
		color: #8a2f20;
	}

	.remove-section-form {
		margin-top: 0.75rem;
	}

	.section-note {
		margin: 0.75rem 0 0;
		color: #607177;
	}

	.bulk-move {
		align-items: end;
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.bulk-move label {
		min-width: min(100%, 18rem);
	}

	.player-move-list {
		padding-top: 0.75rem;
		border-top: 1px solid #ece3d5;
	}

	.player-move-list h5 {
		margin: 0;
		font-size: 1rem;
	}

	.player-move {
		grid-template-columns: minmax(0, 1fr);
		align-items: center;
	}

	.add-section {
		display: grid;
		gap: 0.55rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #e3e8e6;
	}

	label {
		display: grid;
		gap: 0.35rem;
		font-weight: 800;
	}

	label span {
		color: #1d3537;
	}

	input,
	select {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #c8d4d1;
		border-radius: 0.65rem;
		background: #fff;
		font: inherit;
	}

	input[type='checkbox'] {
		width: auto;
	}

	.checkbox {
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
	}

	.save {
		justify-self: start;
	}

	@media (min-width: 840px) {
		.config-grid,
		.section-fields {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.player-move {
			grid-template-columns: minmax(0, 1fr) minmax(12rem, 0.5fr);
		}

		.add-section {
			grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
			align-items: end;
		}

		.add-section h4 {
			grid-column: 1 / -1;
		}
	}
</style>
