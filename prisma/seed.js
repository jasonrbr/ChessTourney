import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const seedEmailDomain = 'seed.chesstourney.local';
const tournamentSlug = 'friday-night-blitz';

const players = [
	['Alice', 'Chen', 1820],
	['Bob', 'Smith', 1765],
	['Maria', 'Lee', 1690],
	['Dev', 'Patel', 1625],
	['Sam', 'Ortiz', 1580],
	['Nina', 'Patel', 1510],
	['Owen', 'Brooks', 1450],
	['Grace', 'Kim', 1395],
	['Taylor', 'Morgan', null]
];

function seedEmail(firstName, lastName) {
	return `${firstName}.${lastName}@${seedEmailDomain}`.toLowerCase();
}

async function main() {
	await prisma.$transaction(async (tx) => {
		await tx.tournament.deleteMany({ where: { slug: tournamentSlug } });
		await tx.player.deleteMany({ where: { email: { endsWith: `@${seedEmailDomain}` } } });

		const tournament = await tx.tournament.create({
			data: {
				name: 'Friday Night Blitz',
				slug: tournamentSlug,
				organizationName: 'Michigan Chess Club',
				location: 'Ann Arbor, MI',
				startDate: new Date('2026-05-16T00:00:00'),
				endDate: new Date('2026-05-16T00:00:00'),
				visibility: 'PUBLISHED',
				status: 'REGISTRATION_OPEN',
				format: 'DOUBLE_ROUND_SWISS',
				timeControl: '5+0',
				totalRounds: 4,
				isRated: true,
				affiliateName: 'Michigan Chess Club USCF Affiliate'
			}
		});

		const section = await tx.section.create({
			data: {
				name: 'Open',
				unratedPolicy: 'TD_REVIEW',
				tournamentId: tournament.id
			}
		});

		for (const [firstName, lastName, rating] of players) {
			const ratingValue = rating == null ? null : Number(rating);
			const player = await tx.player.create({
				data: {
					firstName: String(firstName),
					lastName: String(lastName),
					email: seedEmail(String(firstName), String(lastName)),
					rating: ratingValue
				}
			});

			await tx.registration.create({
				data: {
					tournamentId: tournament.id,
					sectionId: section.id,
					playerId: player.id,
					seedRating: ratingValue,
					eligibilityReviewStatus: ratingValue == null ? 'PENDING' : 'NOT_REQUIRED',
					eligibilityReviewReason:
						ratingValue == null ? `Unrated player requires TD review for ${section.name}.` : null
				}
			});
		}
	});
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (error) => {
		console.error(error);
		await prisma.$disconnect();
		process.exit(1);
	});
