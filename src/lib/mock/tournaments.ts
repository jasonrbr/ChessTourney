export type TournamentVisibility = 'draft' | 'published';
export type TournamentFormat = 'Swiss' | 'Round Robin' | 'Team';

export type SectionSummary = {
	id: string;
	name: string;
	format: TournamentFormat;
	minRating: number | null;
	maxRating: number | null;
	unratedPolicy: 'allowed' | 'blocked' | 'td-review';
};

export type TournamentSummary = {
	id: string;
	slug: string;
	name: string;
	organizationName: string;
	startDate: string;
	endDate: string;
	visibility: TournamentVisibility;
	format: TournamentFormat;
	isRated: boolean;
	isFideRated: boolean;
	affiliateName: string | null;
	location: string;
	checkInEnabled: boolean;
	paymentMode: 'deferred' | 'offline-only' | 'hosted-online-later';
	sections: SectionSummary[];
};

export const tournaments: TournamentSummary[] = [
	{
		id: 't-2026-spring-open',
		slug: 'spring-open-2026',
		name: 'Spring Open 2026',
		organizationName: 'Cleveland Chess Club',
		startDate: '2026-05-16',
		endDate: '2026-05-17',
		visibility: 'published',
		format: 'Swiss',
		isRated: true,
		isFideRated: false,
		affiliateName: 'Cleveland Chess Club USCF Affiliate',
		location: 'Cleveland, OH',
		checkInEnabled: true,
		paymentMode: 'offline-only',
		sections: [
			{
				id: 'open',
				name: 'Open',
				format: 'Swiss',
				minRating: null,
				maxRating: null,
				unratedPolicy: 'td-review'
			},
			{
				id: 'u1600',
				name: 'Under 1600',
				format: 'Swiss',
				minRating: null,
				maxRating: 1599,
				unratedPolicy: 'blocked'
			}
		]
	},
	{
		id: 't-2026-scholastic-teams',
		slug: 'scholastic-teams-2026',
		name: 'Scholastic Team Championship',
		organizationName: 'North Coast Scholastic Chess',
		startDate: '2026-06-06',
		endDate: '2026-06-06',
		visibility: 'draft',
		format: 'Team',
		isRated: false,
		isFideRated: false,
		affiliateName: null,
		location: 'Lakewood, OH',
		checkInEnabled: false,
		paymentMode: 'deferred',
		sections: [
			{
				id: 'k8-team',
				name: 'K-8 Team',
				format: 'Team',
				minRating: null,
				maxRating: null,
				unratedPolicy: 'allowed'
			}
		]
	},
	{
		id: 't-2026-summer-round-robin',
		slug: 'summer-round-robin-2026',
		name: 'Summer Round Robin',
		organizationName: 'Cleveland Chess Club',
		startDate: '2026-07-10',
		endDate: '2026-07-12',
		visibility: 'draft',
		format: 'Round Robin',
		isRated: true,
		isFideRated: true,
		affiliateName: 'Cleveland Chess Club USCF Affiliate',
		location: 'Cleveland, OH',
		checkInEnabled: true,
		paymentMode: 'hosted-online-later',
		sections: [
			{
				id: 'championship',
				name: 'Championship RR',
				format: 'Round Robin',
				minRating: 1800,
				maxRating: null,
				unratedPolicy: 'blocked'
			}
		]
	}
];

export function getTournamentBySlug(slug: string) {
	return tournaments.find((tournament) => tournament.slug === slug);
}
