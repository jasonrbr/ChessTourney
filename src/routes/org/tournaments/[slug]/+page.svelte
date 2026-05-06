<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData, SubmitFunction } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const actionMessage = $derived(form && 'message' in form ? form.message : null);

	const scoreLabel = (scoreUnits: number | null | undefined) =>
		scoreUnits == null ? '' : String(scoreUnits / 2).replace('.5', '.5');
	const statusLabel = (value: string) => value.replaceAll('_', ' ').toLowerCase();
	const playerName = (registration: { player: { firstName: string; lastName: string } }) =>
		`${registration.player.firstName} ${registration.player.lastName}`;
	const formatDate = (value: Date | string) =>
		new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
			new Date(value)
		);
	const dateInput = (value: Date | string) => new Date(value).toISOString().slice(0, 10);
	const unratedPolicyLabel = (value: string) =>
		({
			ALLOWED: 'Unrated allowed',
			BLOCKED: 'Unrated not eligible',
			TD_REVIEW: 'Unrated by TD review'
		})[value] ?? value;
	const sectionName = (sectionId: string) =>
		data.tournament.sections.find((section) => section.id === sectionId)?.name ?? 'Section';
	const sectionRegistrationCount = (sectionId: string) =>
		data.tournament.registrations.filter((registration) => registration.sectionId === sectionId).length;
	const sectionRegistrations = (sectionId: string) =>
		data.tournament.registrations.filter((registration) => registration.sectionId === sectionId);
	const otherSections = (sectionId: string) =>
		data.tournament.sections.filter((section) => section.id !== sectionId);
	const sectionHasRounds = (sectionId: string) =>
		data.tournament.rounds.some((round) => round.sectionId === sectionId);
	const registrationNeedsEligibilityReview = (registration: {
		seedRating: number | null;
		eligibilityReviewStatus: string;
		section?: { unratedPolicy: string };
	}) =>
		registration.eligibilityReviewStatus === 'PENDING' ||
		(registration.eligibilityReviewStatus === 'NOT_REQUIRED' &&
			registration.seedRating == null &&
			registration.section?.unratedPolicy === 'TD_REVIEW');
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

	const currentRoundNumber = $derived(data.tournament.rounds.at(-1)?.number ?? 0);
	const currentRounds = $derived(
		data.tournament.rounds.filter((round) => round.number === currentRoundNumber)
	);
	const nextRoundNumber = $derived(currentRoundNumber + 1);
	const canGenerateRound = $derived(currentRoundNumber < data.tournament.totalRounds);
	const reviewRegistrations = $derived(
		data.tournament.registrations.filter(registrationNeedsEligibilityReview)
	);
	const registeredPlayers = $derived(
		data.tournament.registrations.filter(
			(registration) =>
				registration.status === 'REGISTERED' &&
				!registrationNeedsEligibilityReview(registration) &&
				registration.eligibilityReviewStatus !== 'REJECTED'
		)
	);

	function fillScore(pairingId: string, whiteScore: string, blackScore: string) {
		const white = document.querySelector<HTMLInputElement>(`input[name="whiteScore-${pairingId}"]`);
		const black = document.querySelector<HTMLInputElement>(`input[name="blackScore-${pairingId}"]`);
		if (white) white.value = whiteScore;
		if (black) black.value = blackScore;
	}

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
	<title>{data.tournament.name} | ChessTourney</title>
</svelte:head>

<section class="page">
	<header class="hero">
		<div>
			<p class="status">{statusLabel(data.tournament.status)} · {statusLabel(data.tournament.visibility)}</p>
			<h2>{data.tournament.name}</h2>
			<p>{data.tournament.organizationName} · {data.tournament.location} · {formatDate(data.tournament.startDate)}</p>
		</div>
		<div class="actions">
			<a href={`/tournaments/${data.tournament.slug}`}>Public page</a>
			<a class="secondary" href="/org/tournaments">All tournaments</a>
		</div>
	</header>

	{#if actionMessage}
		<p class="form-error" role="alert">{actionMessage}</p>
	{/if}

	<section class="quick-grid">
		<article class="card">
			<h3>Event</h3>
			<dl>
				<div><dt>Format</dt><dd>Double Round Swiss</dd></div>
				<div><dt>Time control</dt><dd>{data.tournament.timeControl}</dd></div>
				<div><dt>Rounds</dt><dd>{currentRoundNumber} / {data.tournament.totalRounds}</dd></div>
				<div><dt>Ready players</dt><dd>{registeredPlayers.length}</dd></div>
				<div><dt>Review needed</dt><dd>{reviewRegistrations.length}</dd></div>
				<div><dt>Pairing bye</dt><dd>{scoreLabel(data.tournament.pairingByeScore)} pts</dd></div>
				<div><dt>Requested bye</dt><dd>{scoreLabel(data.tournament.requestedByeScore)} pts</dd></div>
			</dl>
		</article>

		<article class="card">
			<h3>Controls</h3>
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
				{#if data.tournament.status === 'REGISTRATION_OPEN'}
					<form method="POST" action="?/closeRegistration" use:enhance={preserveScroll}>
						<button>Close registration</button>
					</form>
				{/if}
				{#if data.tournament.status === 'REGISTRATION_CLOSED'}
					<form method="POST" action="?/reopenRegistration" use:enhance={preserveScroll}>
						<button class="secondary">Reopen registration</button>
					</form>
					<form method="POST" action="?/start" use:enhance={preserveScroll}>
						<button>Start tournament</button>
					</form>
				{/if}
				{#if data.tournament.status === 'IN_PROGRESS'}
					<form method="POST" action="?/returnToRegistrationClosed" use:enhance={preserveScroll}>
						<button class="secondary">Return to registration closed</button>
					</form>
					<form method="POST" action="?/complete" use:enhance={preserveScroll}>
						<button>Mark complete</button>
					</form>
				{/if}
				{#if data.tournament.status === 'COMPLETE'}
					<form method="POST" action="?/resume" use:enhance={preserveScroll}>
						<button class="secondary">Resume tournament</button>
					</form>
				{/if}
				<form method="POST" action="?/generateRound" use:enhance={preserveScroll}>
					<button disabled={!canGenerateRound}>Generate round {nextRoundNumber}</button>
				</form>
			</div>
		</article>
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

	<section class="card">
		<div class="section-head">
			<div>
				<h3>Registration review</h3>
				<p>Unrated entries using TD review stay out of pairings until approved.</p>
			</div>
		</div>

		{#if reviewRegistrations.length > 0}
			<div class="review-list">
				{#each reviewRegistrations as registration}
					<div class="review-row">
						<div>
							<strong>{playerName(registration)}</strong>
							<span>{sectionName(registration.sectionId)} · Unrated</span>
							<small>{registration.eligibilityReviewReason ?? 'TD review required'}</small>
						</div>
						<div class="review-actions">
							<form method="POST" action="?/approveRegistration" use:enhance={preserveScroll}>
								<input type="hidden" name="registrationId" value={registration.id} />
								<button>Approve</button>
							</form>
							<form method="POST" action="?/rejectRegistration" use:enhance={preserveScroll}>
								<input type="hidden" name="registrationId" value={registration.id} />
								<button class="secondary">Reject</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="empty-note">No registrations need review.</p>
		{/if}
	</section>

	<section class="card">
		<div class="section-head">
			<div>
				<h3>Active registrations</h3>
				<p>Add late players and mark requested byes before generating a round.</p>
			</div>
		</div>

		<div class="roster">
			{#each registeredPlayers as registration}
				<div class="roster-row">
					<div>
						<strong>{playerName(registration)}</strong>
						<span>{registration.seedRating ?? 'Unrated'}</span>
						<small>{sectionName(registration.sectionId)}</small>
					</div>
					<form method="POST" action="?/requestBye" class="inline-form" use:enhance={preserveScroll}>
						<input type="hidden" name="registrationId" value={registration.id} />
						<input type="hidden" name="sectionId" value={registration.sectionId} />
						<label>
							<span>Round</span>
							<input name="roundNumber" type="number" min="1" value={nextRoundNumber} />
						</label>
						<label>
							<span>Bye score</span>
							<input name="score" inputmode="decimal" value={scoreLabel(data.tournament.requestedByeScore)} />
						</label>
						<button>Set bye</button>
					</form>
				</div>
			{/each}
		</div>

		<form
			method="POST"
			action="?/addWalkIn"
			class="add-player"
			use:enhance={preserveScrollAndResetOnSuccess}
		>
			<h4>Add player</h4>
			<input name="firstName" placeholder="First name" required />
			<input name="lastName" placeholder="Last name" required />
			<input name="rating" inputmode="numeric" placeholder="Rating" />
			<select name="sectionId">
				{#each data.tournament.sections as section}
					<option value={section.id}>{section.name}</option>
				{/each}
			</select>
			<button>Add</button>
		</form>
	</section>

	{#if currentRounds.length > 0}
		<section class="card round-card">
			<div class="section-head">
				<div>
					<h3>Round {currentRoundNumber}</h3>
					<p>Left player has White in the first game. Enter total score for both games.</p>
				</div>
			</div>

			<div class="round-sections">
				{#each currentRounds as round}
					<form method="POST" action="?/saveResults" class="pairing-form" use:enhance={preserveScroll}>
						<div class="round-section-head">
							<h4>{sectionName(round.sectionId)}</h4>
						</div>
						<input type="hidden" name="roundId" value={round.id} />

						{#each round.pairings as pairing}
							{#if pairing.pairingType === 'BYE' && pairing.byeRegistration}
								<article class="pairing bye">
									<div class="board">Board {pairing.boardNumber}</div>
									<div>
										<strong>{playerName(pairing.byeRegistration)}</strong>
										<p>
											{pairing.byeType === 'REQUESTED' ? 'Requested bye' : 'Pairing bye'} ·
											{scoreLabel(pairing.byeScoreUnits)} pts
										</p>
									</div>
								</article>
							{:else if pairing.whiteFirstRegistration && pairing.blackFirstRegistration}
								<article class="pairing">
									<div class="board">Board {pairing.boardNumber}</div>
									<input type="hidden" name="pairingId" value={pairing.id} />
									<label class="player-score">
										<span>{playerName(pairing.whiteFirstRegistration)}</span>
										<input
											name={`whiteScore-${pairing.id}`}
											inputmode="decimal"
											value={scoreLabel(pairing.whiteFirstScoreUnits)}
											aria-label={`${playerName(pairing.whiteFirstRegistration)} score`}
										/>
									</label>
									<label class="player-score right">
										<input
											name={`blackScore-${pairing.id}`}
											inputmode="decimal"
											value={scoreLabel(pairing.blackFirstScoreUnits)}
											aria-label={`${playerName(pairing.blackFirstRegistration)} score`}
										/>
										<span>{playerName(pairing.blackFirstRegistration)}</span>
									</label>
									<div class="presets">
										<button type="button" onclick={() => fillScore(pairing.id, '2', '0')}>2-0</button>
										<button type="button" onclick={() => fillScore(pairing.id, '1.5', '0.5')}>1.5-.5</button>
										<button type="button" onclick={() => fillScore(pairing.id, '1', '1')}>1-1</button>
										<button type="button" onclick={() => fillScore(pairing.id, '0.5', '1.5')}>.5-1.5</button>
										<button type="button" onclick={() => fillScore(pairing.id, '0', '2')}>0-2</button>
									</div>
								</article>
							{/if}
						{/each}

						<button class="save">Save {sectionName(round.sectionId)} results</button>
					</form>
				{/each}
			</div>
		</section>
	{/if}

	<section class="card">
		<h3>Standings</h3>
		<div class="standings">
			{#each data.standings as row, index}
				<div class="standing-row">
					<span>{index + 1}</span>
					<strong>{playerName(row.registration)}</strong>
					<span>{scoreLabel(row.pointsUnits)} pts</span>
					<small>{sectionName(row.registration.sectionId)} · {row.registration.seedRating ?? 'Unrated'}</small>
				</div>
			{/each}
		</div>
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

	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.actions a.secondary,
	button.secondary {
		background: #dbe5e2;
		color: #1d3b39;
	}

	.quick-grid {
		display: grid;
		gap: 1rem;
	}

	dl {
		display: grid;
		gap: 0.65rem;
		margin: 1rem 0 0;
	}

	dl div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding-top: 0.65rem;
		border-top: 1px solid #e3e8e6;
	}

	dt {
		font-weight: 800;
		color: #607177;
	}

	dd {
		margin: 0;
		text-align: right;
	}

	.section-head {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.roster,
	.config-form,
	.config-grid,
	.bulk-move,
	.player-move-list,
	.review-list,
	.remove-section-form,
	.section-list,
	.section-fields,
	.section-update,
	.pairing-form,
	.round-sections,
	.standings {
		display: grid;
		gap: 0.75rem;
	}

	.roster-row,
	.review-row,
	.section-editor,
	.pairing,
	.standing-row {
		display: grid;
		gap: 0.75rem;
		padding: 0.85rem;
		border-radius: 0.75rem;
		background: #fffcf6;
		border: 1px solid #ece3d5;
	}

	.roster-row span,
	.review-row span,
	.pairing p,
	.standing-row small,
	.empty-note {
		color: #607177;
	}

	.roster-row small,
	.review-row small {
		color: #607177;
	}

	.empty-note {
		margin: 0;
	}

	.review-row {
		grid-template-columns: minmax(0, 1fr);
	}

	.review-row > div:first-child {
		display: grid;
		gap: 0.25rem;
	}

	.review-actions,
	.bulk-move {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
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

	.round-section-head {
		padding-top: 0.25rem;
	}

	.inline-form,
	.add-player {
		display: grid;
		gap: 0.55rem;
	}

	.inline-form {
		grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
		align-items: end;
	}

	.add-player {
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

	.board {
		font-size: 0.82rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #8f5d2f;
	}

	.player-score {
		grid-template-columns: minmax(0, 1fr) 4.6rem;
		align-items: center;
	}

	.player-score.right {
		grid-template-columns: 4.6rem minmax(0, 1fr);
	}

	.player-score input {
		text-align: center;
		font-weight: 900;
		font-size: 1.15rem;
	}

	.presets {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.4rem;
	}

	.presets button {
		padding: 0.55rem 0.25rem;
		border-radius: 0.55rem;
		background: #dbe5e2;
		color: #1d3b39;
		font-size: 0.85rem;
	}

	.bye {
		background: #eef5f3;
	}

	.save {
		justify-self: start;
	}

	.standing-row {
		grid-template-columns: 2rem minmax(0, 1fr) auto;
		align-items: center;
	}

	.standing-row small {
		grid-column: 2 / -1;
	}

	@media (min-width: 840px) {
		.quick-grid {
			grid-template-columns: minmax(0, 1fr) minmax(280px, 0.7fr);
		}

		.config-grid,
		.section-fields {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.roster-row {
			grid-template-columns: minmax(0, 1fr) minmax(360px, 0.9fr);
			align-items: center;
		}

		.review-row {
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: center;
		}

		.player-move {
			grid-template-columns: minmax(0, 1fr) minmax(12rem, 0.5fr);
		}

		.add-player,
		.add-section {
			grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
			align-items: end;
		}

		.add-player h4,
		.add-section h4 {
			grid-column: 1 / -1;
		}

		.pairing {
			grid-template-columns: 5rem minmax(0, 1fr) minmax(0, 1fr);
			align-items: center;
		}

		.presets {
			grid-column: 2 / -1;
		}
	}
</style>
