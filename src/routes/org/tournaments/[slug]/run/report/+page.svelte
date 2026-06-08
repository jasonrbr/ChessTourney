<script lang="ts">
	import type { PageData } from './$types';
	import type { CrosstableRoundCell } from '$lib/domain/crosstable';

	let { data }: { data: PageData } = $props();

	const formatDate = (value: Date | string) =>
		new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
			new Date(value)
		);

	const dateRange = (start: Date | string, end: Date | string) => {
		const a = formatDate(start);
		const b = formatDate(end);
		return a === b ? a : `${a} – ${b}`;
	};

	const games = (cell: CrosstableRoundCell) => (cell.type === 'GAMES' ? cell.games : []);

	function printReport() {
		window.print();
	}
</script>

<svelte:head>
	<title>{data.tournament.name} · Rating report | ChessTourney</title>
</svelte:head>

<section class="page">
	<header class="report-head">
		<div>
			<h2>{data.tournament.name}</h2>
			<p>{data.tournament.organizationName} · {data.tournament.location}</p>
			<p class="meta">
				{dateRange(data.tournament.startDate, data.tournament.endDate)} · Swiss ·
				{data.tournament.totalRounds} rounds · TC {data.tournament.timeControl} ·
				{data.tournament.isRated ? `US Chess rated${data.tournament.affiliateName ? ` · ${data.tournament.affiliateName}` : ''}` : 'Unrated'}
			</p>
		</div>
		<div class="actions no-print">
			<button onclick={printReport}>Download PDF</button>
			<a class="secondary" href={`/org/tournaments/${data.tournament.slug}/run`}>Back to run</a>
		</div>
	</header>

	<p class="hint no-print">
		Player numbers follow final standing. Each round shows both games (result and opponent number);
		players swap colors between the two games. Use your browser's “Save as PDF” in the print dialog.
	</p>

	{#each data.sections as section}
		<section class="card crosstable-card">
			<h3>{section.name}</h3>
			{#if section.crosstable.rows.length === 0}
				<p>No reportable players in this section.</p>
			{:else}
				<table class="crosstable">
					<thead>
						<tr>
							<th class="num">#</th>
							<th class="name">Player</th>
							<th class="rtg">Rtg</th>
							{#each section.crosstable.roundNumbers as roundNumber}
								<th class="round">R{roundNumber}</th>
							{/each}
							<th class="total">Tot</th>
						</tr>
					</thead>
					<tbody>
						{#each section.crosstable.rows as row}
							<tr>
								<td class="num">{row.number}</td>
								<td class="name">{row.name}</td>
								<td class="rtg">{row.rating ?? 'UNR'}</td>
								{#each section.crosstable.roundNumbers as roundNumber}
									{@const cell = row.cellsByRound[roundNumber]}
									<td class="round">
										{#if cell.type === 'BYE'}
											<span class="bye">{cell.label}</span>
										{:else if cell.type === 'GAMES'}
											{#each games(cell) as game}
												<span class="game">
													<span class="res {game.result ?? 'none'}">{game.result ?? '·'}</span>{#if game.opponentNumber}<span class="opp">{game.opponentNumber}</span>{/if}<span class="color">{game.color === 'W' ? 'w' : 'b'}</span>
												</span>
											{/each}
										{:else}
											<span class="empty">—</span>
										{/if}
									</td>
								{/each}
								<td class="total">{row.totalLabel}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</section>
	{/each}
</section>

<style>
	.page {
		display: grid;
		gap: 1.25rem;
		padding: 1.5rem;
		max-width: 1100px;
		margin: 0 auto;
	}

	.report-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.report-head h2 {
		margin: 0;
	}

	.report-head p {
		margin: 0.15rem 0 0;
		color: #4a5b60;
	}

	.meta {
		font-size: 0.9rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.hint {
		color: #607177;
		font-size: 0.85rem;
		margin: 0;
	}

	.crosstable-card {
		padding: 1rem;
		border-radius: 0.75rem;
		background: #fffcf6;
		border: 1px solid #ece3d5;
	}

	.crosstable-card h3 {
		margin: 0 0 0.75rem;
	}

	.crosstable {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	.crosstable th,
	.crosstable td {
		border: 1px solid #e3dac9;
		padding: 0.4rem 0.5rem;
		text-align: left;
		vertical-align: top;
	}

	.crosstable th {
		background: #f3ecdf;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.num,
	.rtg,
	.total,
	.round {
		text-align: center;
		white-space: nowrap;
	}

	.total {
		font-weight: 800;
	}

	.game {
		display: inline-flex;
		align-items: baseline;
		gap: 0.1rem;
		margin-right: 0.5rem;
	}

	.res {
		font-weight: 800;
	}

	.res.W {
		color: #1a5c30;
	}

	.res.L {
		color: #9a2a2a;
	}

	.res.D {
		color: #8f5d2f;
	}

	.opp {
		color: #1d3537;
	}

	.color {
		font-size: 0.7rem;
		color: #8b97a0;
	}

	.bye {
		color: #607177;
		font-size: 0.85rem;
	}

	.empty {
		color: #b8c0c4;
	}

	@media print {
		.no-print {
			display: none !important;
		}

		.page {
			padding: 0;
			gap: 0.75rem;
			max-width: none;
		}

		.crosstable-card {
			border: none;
			background: none;
			padding: 0;
			break-inside: avoid;
		}

		.crosstable th {
			background: none;
		}
	}
</style>
