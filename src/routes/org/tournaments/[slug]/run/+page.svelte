<script lang="ts">
	import { enhance } from '$app/forms';
	import { gameUnitsFor, type GameResultCode } from '$lib/domain/scoring';
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
	const sectionName = (sectionId: string) =>
		data.tournament.sections.find((section) => section.id === sectionId)?.name ?? 'Section';

	const registrationNeedsEligibilityReview = (registration: {
		seedRating: number | null;
		eligibilityReviewStatus: string;
		section?: { unratedPolicy: string };
	}) =>
		registration.eligibilityReviewStatus === 'PENDING' ||
		(registration.eligibilityReviewStatus === 'NOT_REQUIRED' &&
			registration.seedRating == null &&
			registration.section?.unratedPolicy === 'TD_REVIEW');

	// For each round number, the score each player had going INTO that round
	// (cumulative from all previous rounds — matches what the pairing algorithm used).
	const scoreBeforeRound = $derived.by(() => {
		const result = new Map<number, Map<string, number>>();
		const running = new Map<string, number>();
		const add = (id: string, units: number) => running.set(id, (running.get(id) ?? 0) + units);
		const nums = [...new Set(data.tournament.rounds.map((r) => r.number))].sort((a, b) => a - b);
		for (const num of nums) {
			result.set(num, new Map(running));
			for (const round of data.tournament.rounds.filter((r) => r.number === num)) {
				for (const pairing of round.pairings) {
					if (pairing.pairingType === 'GAME') {
						for (const game of pairing.games) {
							if (game.result == null) continue;
							add(game.whiteRegistrationId, gameUnitsFor(game.result, 'white'));
							add(game.blackRegistrationId, gameUnitsFor(game.result, 'black'));
						}
					} else if (pairing.byeRegistrationId && pairing.byeScoreUnits != null) {
						add(pairing.byeRegistrationId, pairing.byeScoreUnits);
					}
				}
			}
		}
		return result;
	});

	const currentRoundNumber = $derived(data.tournament.rounds.at(-1)?.number ?? 0);
	const nextRoundNumber = $derived(currentRoundNumber + 1);
	const canGenerateRound = $derived(currentRoundNumber < data.tournament.totalRounds);
	const canEditResults = $derived(data.tournament.status !== 'COMPLETE');
	const allRoundNumbers = $derived(
		[...new Set(data.tournament.rounds.map((r) => r.number))].sort((a, b) => b - a)
	);
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

	type GamePick = '' | GameResultCode;
	type PairingGames = PageData['tournament']['rounds'][number]['pairings'][number]['games'];

	// Session-only result selections, keyed by pairing id, that drive the live combined
	// readout while the TD enters results. Falls back to the persisted result for any
	// pairing the TD hasn't touched this session.
	let livePicks = $state<Record<string, { g1: GamePick; g2: GamePick }>>({});

	function savedPick(games: PairingGames): { g1: GamePick; g2: GamePick } {
		return {
			g1: (games.find((g) => g.gameNumber === 1)?.result ?? '') as GamePick,
			g2: (games.find((g) => g.gameNumber === 2)?.result ?? '') as GamePick
		};
	}

	function effectivePick(pairingId: string, games: PairingGames) {
		return livePicks[pairingId] ?? savedPick(games);
	}

	function setPick(pairingId: string, games: PairingGames, key: 'g1' | 'g2', value: GamePick) {
		livePicks[pairingId] = { ...effectivePick(pairingId, games), [key]: value };
	}

	// Combined units for the two players of a pairing across both games. Player A had
	// White in game 1 (and Black in game 2); player B is the reverse.
	function combinedUnits(pick: { g1: GamePick; g2: GamePick }): [number, number] | null {
		if (pick.g1 === '' || pick.g2 === '') return null;
		const aUnits = gameUnitsFor(pick.g1, 'white') + gameUnitsFor(pick.g2, 'black');
		const bUnits = gameUnitsFor(pick.g1, 'black') + gameUnitsFor(pick.g2, 'white');
		return [aUnits, bUnits];
	}

	type GameRegistration = { player: { firstName: string; lastName: string } };
	function gameResultText(
		result: GameResultCode | null,
		white: GameRegistration,
		black: GameRegistration
	) {
		if (result == null) return '—';
		if (result === 'DRAW') return '½–½';
		return `${playerName(result === 'WHITE_WIN' ? white : black)} won`;
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
	<title>{data.tournament.name} · Run | ChessTourney</title>
</svelte:head>

<section class="page">
	<header class="hero">
		<div>
			<p class="status">{statusLabel(data.tournament.status)} · {statusLabel(data.tournament.visibility)}</p>
			<h2>{data.tournament.name}</h2>
			<p>{data.tournament.organizationName} · {data.tournament.location} · {formatDate(data.tournament.startDate)}</p>
		</div>
		<div class="actions">
			{#if data.tournament.visibility === 'PUBLISHED'}
				<a href={`/tournaments/${data.tournament.slug}`}>Public page</a>
			{/if}
			{#if currentRoundNumber > 0}
					<a class="secondary" href={`/org/tournaments/${data.tournament.slug}/run/report`}>Rating report</a>
				{/if}
				<a class="secondary" href={`/org/tournaments/${data.tournament.slug}`}>Settings</a>
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
				{#if canGenerateRound}
					<form method="POST" action="?/generateRound" use:enhance={preserveScroll}>
						<button>Generate round {nextRoundNumber}</button>
					</form>
				{/if}
			</div>
		</article>
	</section>

	{#each allRoundNumbers as roundNum}
		{@const roundsForNum = data.tournament.rounds.filter((r) => r.number === roundNum)}
		{@const isCurrentRound = roundNum === currentRoundNumber}
		{@const scoreAtRound = scoreBeforeRound.get(roundNum) ?? new Map<string, number>()}
		<details class="card round-card" open={isCurrentRound}>
			<summary class="round-summary">
				<h3>Round {roundNum}</h3>
				{#if roundsForNum.every((r) => r.completedAt)}
					<span class="round-badge complete">Complete</span>
				{:else if isCurrentRound}
					<span class="round-badge active">In progress</span>
				{/if}
			</summary>

			<div class="round-body">
				<div class="round-meta">
					<p>Each pairing is two games; players swap colors for game 2.{#if canEditResults} Record the result of each game.{/if}</p>
					{#if canEditResults && isCurrentRound}
						<form method="POST" action="?/regenerateCurrentRound" use:enhance={preserveScroll}>
							<button class="secondary">Regenerate pairings</button>
						</form>
					{/if}
				</div>

				<div class="round-sections">
					{#each roundsForNum as round}
						<form method="POST" action="?/saveResults" class="pairing-form" use:enhance={preserveScroll}>
							<div class="round-section-head">
								<h4>{sectionName(round.sectionId)}</h4>
							</div>
							{#if canEditResults}
								<input type="hidden" name="roundId" value={round.id} />
							{/if}

							{#each round.pairings.slice().sort((a, b) => {
									if (a.pairingType === 'BYE' && b.pairingType !== 'BYE') return 1;
									if (a.pairingType !== 'BYE' && b.pairingType === 'BYE') return -1;
									return a.boardNumber - b.boardNumber;
								}) as pairing, pairingIndex}
								{#if pairing.pairingType === 'BYE' && pairing.byeRegistration}
									<article class="pairing bye">
										<div class="player-info">
											<strong>{playerName(pairing.byeRegistration)}</strong>
											<small>{pairing.byeRegistration.seedRating ?? 'Unrated'} · {scoreLabel(scoreAtRound.get(pairing.byeRegistration.id) ?? 0)} pts</small>
											<small>{pairing.byeType === 'REQUESTED' ? 'Requested bye' : 'Pairing bye'} · +{scoreLabel(pairing.byeScoreUnits)} pts</small>
										</div>
									</article>
								{:else if pairing.pairingType === 'GAME'}
									{@const game1 = pairing.games.find((g) => g.gameNumber === 1)}
									{@const game2 = pairing.games.find((g) => g.gameNumber === 2)}
									{#if game1 && game2}
										{@const playerA = game1.whiteRegistration}
										{@const playerB = game1.blackRegistration}
										{@const pick = effectivePick(pairing.id, pairing.games)}
										{@const combined = combinedUnits(pick)}
										<article class="pairing">
											<div class="board">Board {pairingIndex + 1}</div>
											<div class="matchup">
												<span class="player-info">
													<strong>{playerName(playerA)}</strong>
													<small>{playerA.seedRating ?? 'Unrated'} · {scoreLabel(scoreAtRound.get(playerA.id) ?? 0)} pts</small>
												</span>
												<span class="versus">
													{#if combined}
														<strong>{scoreLabel(combined[0])} – {scoreLabel(combined[1])}</strong>
													{:else}
														vs
													{/if}
												</span>
												<span class="player-info right">
													<strong>{playerName(playerB)}</strong>
													<small>{playerB.seedRating ?? 'Unrated'} · {scoreLabel(scoreAtRound.get(playerB.id) ?? 0)} pts</small>
												</span>
											</div>

											{#if canEditResults}
												<input type="hidden" name="pairingId" value={pairing.id} />
												{#each [{ n: 1, white: playerA, black: playerB, field: `game1-${pairing.id}`, key: 'g1' as const }, { n: 2, white: playerB, black: playerA, field: `game2-${pairing.id}`, key: 'g2' as const }] as g}
													<fieldset class="game-row">
														<legend>Game {g.n}: {playerName(g.white)} (White) vs {playerName(g.black)} (Black)</legend>
														<div class="presets">
															<label>
																<input type="radio" name={g.field} value="WHITE_WIN" checked={pick[g.key] === 'WHITE_WIN'} onchange={() => setPick(pairing.id, pairing.games, g.key, 'WHITE_WIN')} />
																<span>{playerName(g.white)} won</span>
															</label>
															<label>
																<input type="radio" name={g.field} value="DRAW" checked={pick[g.key] === 'DRAW'} onchange={() => setPick(pairing.id, pairing.games, g.key, 'DRAW')} />
																<span>½–½</span>
															</label>
															<label>
																<input type="radio" name={g.field} value="BLACK_WIN" checked={pick[g.key] === 'BLACK_WIN'} onchange={() => setPick(pairing.id, pairing.games, g.key, 'BLACK_WIN')} />
																<span>{playerName(g.black)} won</span>
															</label>
														</div>
													</fieldset>
												{/each}
											{:else}
												<div class="game-results">
													<span>Game 1: {gameResultText(game1.result, playerA, playerB)}</span>
													<span>Game 2: {gameResultText(game2.result, playerB, playerA)}</span>
												</div>
											{/if}
										</article>
									{/if}
								{/if}
							{/each}

							{#if canEditResults}
								<div class="save-row">
									<button class="save">Save Round {roundNum} results</button>
									{#if form && 'savedRoundId' in form && form.savedRoundId === round.id}
										<span class="saved-badge">Saved</span>
									{/if}
								</div>
							{/if}
						</form>
					{/each}
				</div>
			</div>
		</details>
	{/each}

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
				{#if canGenerateRound}
					<p>Add late players and mark requested byes before generating a round.</p>
				{/if}
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
					{#if canGenerateRound}
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
					{/if}
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
	.round-sections,
	.review-list,
	.pairing-form,
	.standings {
		display: grid;
		gap: 0.75rem;
	}

	.roster-row,
	.review-row,
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

	.review-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.round-card {
		padding: 0;
	}

	.round-summary {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.1rem;
		cursor: pointer;
		list-style: none;
		user-select: none;
	}

	.round-summary::-webkit-details-marker {
		display: none;
	}

	.round-summary h3 {
		flex: 1;
	}

	.round-badge {
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 800;
	}

	.round-badge.complete {
		background: #d4edda;
		color: #1a5c30;
	}

	.round-badge.active {
		background: #fff3cd;
		color: #7d5a00;
	}

	.round-body {
		padding: 0 1.1rem 1.1rem;
	}

	.round-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.round-meta p {
		margin: 0;
		color: #54676d;
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

	.board {
		font-size: 0.82rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #8f5d2f;
	}

	.matchup {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		align-items: center;
		gap: 0.75rem;
	}

	.versus {
		text-align: center;
		font-weight: 900;
		font-size: 1.1rem;
		color: #1d3537;
		white-space: nowrap;
	}

	.player-info {
		display: grid;
		gap: 0.15rem;
	}

	.player-info small {
		color: #607177;
		font-size: 0.8rem;
	}

	.player-info.right {
		text-align: right;
	}

	.game-row {
		border: 0;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.35rem;
	}

	.game-row legend {
		padding: 0;
		font-size: 0.8rem;
		color: #607177;
	}

	.game-results {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		font-weight: 600;
		color: #1d3537;
	}

	.presets {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.4rem;
	}

	.presets label {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.5rem 0.4rem;
		border-radius: 0.55rem;
		background: #dbe5e2;
		color: #1d3b39;
		font-size: 0.85rem;
		text-align: center;
		cursor: pointer;
	}

	.presets label:has(input:checked) {
		background: #8f5d2f;
		color: #fff;
	}

	.presets input {
		accent-color: #8f5d2f;
	}

	.bye {
		background: #eef5f3;
	}

	.save-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.saved-badge {
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		background: #d4edda;
		color: #1a5c30;
		font-size: 0.85rem;
		font-weight: 800;
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

		.roster-row {
			grid-template-columns: minmax(0, 1fr) minmax(360px, 0.9fr);
			align-items: center;
		}

		.review-row {
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: center;
		}

		.add-player {
			grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
			align-items: end;
		}

		.add-player h4 {
			grid-column: 1 / -1;
		}

	}
</style>
