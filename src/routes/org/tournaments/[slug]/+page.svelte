<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const yesNo = (value: boolean) => (value ? 'Yes' : 'No');
</script>

<svelte:head>
	<title>{data.tournament.name} | ChessTourney</title>
</svelte:head>

<section class="page">
	<header class="hero">
		<div>
			<p class="status">{data.tournament.visibility}</p>
			<h2>{data.tournament.name}</h2>
			<p>{data.tournament.organizationName} · {data.tournament.location}</p>
		</div>
		<div class="actions">
			<a href="/org/tournaments">Back to tournaments</a>
			<a class="secondary" href="/org/tournaments/new">Duplicate as draft</a>
		</div>
	</header>

	<div class="content">
		<section class="card">
			<h3>Configuration</h3>
			<dl>
				<div><dt>Format</dt><dd>{data.tournament.format}</dd></div>
				<div><dt>Rated</dt><dd>{yesNo(data.tournament.isRated)}</dd></div>
				<div><dt>Also FIDE-rated</dt><dd>{yesNo(data.tournament.isFideRated)}</dd></div>
				<div><dt>Affiliate</dt><dd>{data.tournament.affiliateName ?? 'Not assigned'}</dd></div>
				<div><dt>Check-in enabled</dt><dd>{yesNo(data.tournament.checkInEnabled)}</dd></div>
				<div><dt>Payment mode</dt><dd>{data.tournament.paymentMode}</dd></div>
			</dl>
		</section>

		<section class="card">
			<h3>Sections</h3>
			<div class="sections">
				{#each data.tournament.sections as section}
					<article>
						<h4>{section.name}</h4>
						<p>{section.format}</p>
						<ul>
							<li>Min rating: {section.minRating ?? 'None'}</li>
							<li>Max rating: {section.maxRating ?? 'None'}</li>
							<li>Unrated policy: {section.unratedPolicy}</li>
						</ul>
					</article>
				{/each}
			</div>
		</section>

		<section class="card wide">
			<h3>Publication readiness</h3>
			<ul class="checklist">
				<li class:good={!data.tournament.isRated || !!data.tournament.affiliateName}>
					Rated-affiliate rule satisfied
				</li>
				<li class:good={data.tournament.sections.length > 0}>At least one section configured</li>
				<li class:good={data.tournament.visibility === 'published'}>
					Visibility state explicitly chosen
				</li>
				<li class="muted">Registration and payments will be wired in a later slice.</li>
			</ul>
		</section>
	</div>
</section>

<style>
	.page {
		display: grid;
		gap: 1rem;
	}

	.hero {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: space-between;
		align-items: start;
		padding: 1.2rem;
		border-radius: 1.1rem;
		background: rgba(255, 255, 255, 0.82);
		border: 1px solid #d9e2df;
	}

	.status {
		margin: 0 0 0.4rem;
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #8f5d2f;
	}

	h2 {
		margin: 0;
	}

	.hero p:last-child {
		color: #54676d;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.actions a {
		padding: 0.75rem 1rem;
		border-radius: 999px;
		text-decoration: none;
		font-weight: 700;
		background: #1d3b39;
		color: #f7f4ea;
	}

	.actions a.secondary {
		background: #dbe5e2;
		color: #1d3b39;
	}

	.content {
		display: grid;
		gap: 1rem;
	}

	.card {
		padding: 1.2rem;
		border-radius: 1.1rem;
		background: rgba(255, 255, 255, 0.82);
		border: 1px solid #d9e2df;
	}

	.card h3 {
		margin-top: 0;
	}

	dl {
		display: grid;
		gap: 0.8rem;
		margin: 0;
	}

	dl div {
		padding-top: 0.7rem;
		border-top: 1px solid #e3e8e6;
	}

	dt {
		font-weight: 700;
		color: #607177;
	}

	dd {
		margin: 0.25rem 0 0;
		color: #20363a;
	}

	.sections {
		display: grid;
		gap: 0.8rem;
	}

	.sections article {
		padding: 0.9rem;
		border-radius: 0.9rem;
		background: #fffcf6;
		border: 1px solid #ece3d5;
	}

	.sections h4 {
		margin: 0;
	}

	.sections p {
		margin: 0.3rem 0 0.75rem;
		color: #55676c;
	}

	.sections ul {
		margin: 0;
		padding-left: 1.1rem;
		color: #243a3e;
	}

	.checklist {
		margin: 0;
		padding-left: 1.1rem;
		line-height: 1.7;
	}

	.good {
		color: #27584f;
	}

	.muted {
		color: #68797e;
	}

	@media (min-width: 980px) {
		.content {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.wide {
			grid-column: 1 / -1;
		}
	}
</style>
