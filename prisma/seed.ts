import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Demo seed: one R1 series with realistic bet365-style odds so the UI has
// something to show on first run. Safe to re-run (idempotent via deleteMany).
async function main() {
  const teamA = "Boston Celtics";
  const teamB = "Miami Heat";

  // Clear any previous demo data so re-running the seed is safe.
  await prisma.pick.deleteMany({});
  await prisma.seriesResult.deleteMany({});
  await prisma.seriesOdds.deleteMany({});
  await prisma.series.deleteMany({});

  const lockTime = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2); // 2 days from now

  const series = await prisma.series.create({
    data: {
      round: "R1",
      teamA,
      teamB,
      lockTime,
      odds: {
        create: [
          { team: teamA, games: null, odds: 1.5 },
          { team: teamA, games: 4, odds: 5.7 },
          { team: teamA, games: 5, odds: 4.2 },
          { team: teamA, games: 6, odds: 5.7 },
          { team: teamA, games: 7, odds: 8.5 },
          { team: teamB, games: null, odds: 3.6 },
          { team: teamB, games: 4, odds: 21.0 },
          { team: teamB, games: 5, odds: 15.0 },
          { team: teamB, games: 6, odds: 12.0 },
          { team: teamB, games: 7, odds: 18.0 },
        ],
      },
    },
  });

  console.log(`Seeded series ${series.id}: ${teamA} vs ${teamB}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
