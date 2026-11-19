import "dotenv/config";
import { randomInt } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";

const SEED_DOMAIN = "example.com";
const SEED_PREFIX = "ifag-demo";

const trainers = [
  { name: "Karim Benali", email: "karim.benali@example.com", specialty: "Développement Web Full Stack" },
  { name: "Sarah Mansouri", email: "sarah.mansouri@example.com", specialty: "React & Next.js" },
  { name: "Yacine Boudjemaa", email: "yacine.boudjemaa@example.com", specialty: "Node.js & API REST" },
  { name: "Lina Haddad", email: "lina.haddad@example.com", specialty: "Python & Intelligence Artificielle" },
  { name: "Amine Bouzid", email: "amine.bouzid@example.com", specialty: "Cybersécurité & Réseaux" },
  { name: "Inès Rahmani", email: "ines.rahmani@example.com", specialty: "Data Science" },
  { name: "Mehdi Cherif", email: "mehdi.cherif@example.com", specialty: "UI/UX Design" },
];

const courses = [
  { name: "Développement Web Full Stack", category: "Développement", durationHours: 120 },
  { name: "Développement Frontend React & Next.js", category: "Développement", durationHours: 90 },
  { name: "Développement Backend Node.js", category: "Développement", durationHours: 90 },
  { name: "Python & Intelligence Artificielle", category: "Intelligence artificielle", durationHours: 100 },
  { name: "Cybersécurité & Réseaux", category: "Infrastructure", durationHours: 110 },
  { name: "Data Science & Analyse de données", category: "Data", durationHours: 100 },
  { name: "UI/UX Design & Figma", category: "Design", durationHours: 70 },
];

const firstNames = [
  "Mohamed", "Amira", "Yasmine", "Rayan", "Nour",
  "Sofiane", "Imane", "Walid", "Meriem", "Adel",
  "Sara", "Youcef", "Lydia", "Anis", "Nesrine",
  "Bilal", "Kenza", "Samir", "Amina", "Farid",
  "Chaima", "Ilyes", "Nadia", "Reda", "Hiba",
  "Omar", "Malek", "Islam", "Aya", "Zakaria",
  "Rania", "Ayoub", "Lamia", "Mehdi", "Ines",
];

const lastNames = [
  "Brahimi", "Saidi", "Bensalem", "Haddadi", "Mansouri",
  "Bouziane", "Khelifi", "Rahmani", "Cherif", "Hamdi",
  "Belaid", "Dahmani", "Boukhalfa", "Messaoudi", "Benyahia",
  "Boudiaf", "Zeroual", "Bensaci", "Ait Ali", "Mokrani",
  "Belkacem", "Djebbar", "Kaci", "Mekki", "Ferhat",
  "Boudjemaa", "Hadj", "Gherbi", "Boukhris", "Benamar",
  "Kaddour", "Tebboune", "Boussaid", "Amrani", "Ziani",
];

function dateAt(dayOffset: number, hour: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed de démonstration interdit en production.");
  }

  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (!databaseUrl) {
    throw new Error("DATABASE_URL manquante.");
  }

  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");

  if (databaseName !== "ifag_db") {
    throw new Error(
      `Base non autorisée : ${databaseName}. Ce script est réservé à ifag_db.`,
    );
  }

  const demoPassword = process.env.IFAG_DEMO_PASSWORD;

  if (!demoPassword || demoPassword.length < 12) {
    throw new Error("IFAG_DEMO_PASSWORD doit contenir au moins 12 caractères.");
  }

  const passwordHash = await hashPassword(demoPassword);

  console.log("Création des données de démonstration IFAG...");

  // 1. Formateurs
  const trainerRecords = [];

  for (const trainer of trainers) {
    const existing = await prisma.user.findUnique({
      where: { email: trainer.email },
    });

    if (existing && existing.role !== "TRAINER") {
      throw new Error(`Conflit de rôle pour ${trainer.email}`);
    }

    const record = existing ?? await prisma.user.create({
      data: {
        ...trainer,
        role: "TRAINER",
        status: "ACTIVE",
        passwordHash,
      },
    });

    trainerRecords.push(record);
  }

  // 2. Apprenants
  const learnerRecords = [];

  for (let i = 0; i < 35; i++) {
    const name = `${firstNames[i]} ${lastNames[i]}`;
    const email = `apprenant${String(i + 1).padStart(2, "0")}@${SEED_DOMAIN}`;

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing && existing.role !== "LEARNER") {
      throw new Error(`Conflit de rôle pour ${email}`);
    }

    const record = existing ?? await prisma.user.create({
      data: {
        name,
        email,
        role: "LEARNER",
        status: "ACTIVE",
        passwordHash,
      },
    });

    learnerRecords.push(record);
  }

  // 3. Formations
  const courseRecords = [];

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];

    const existing = await prisma.course.findFirst({
      where: { name: course.name },
    });

    const record = existing ?? await prisma.course.create({
      data: {
        ...course,
        trainerId: trainerRecords[i].id,
        description: `Formation pratique en ${course.name}.`,
        objectives: "Acquérir des compétences professionnelles et réaliser des projets.",
        prerequisites: "Connaissances de base en informatique.",
        modules: "Introduction, fondamentaux, pratique, projet final.",
        status: "PUBLISHED",
      },
    });

    courseRecords.push(record);
  }

  // 4. Sessions : deux par formation
  const sessionRecords: Array<{
    id: string;
    courseId: string;
  }> = [];

  for (let i = 0; i < courseRecords.length; i++) {
    const course = courseRecords[i];

    for (let j = 0; j < 2; j++) {
      const startsAt = dateAt(7 + i * 3 + j * 14, 9);
      const endsAt = new Date(startsAt.getTime() + 3 * 60 * 60 * 1000);
      const location = `Salle ${String(i + 1).padStart(2, "0")}`;

      const existing = await prisma.trainingSession.findFirst({
        where: {
          courseId: course.id,
          startsAt,
        },
      });

      const record = existing ?? await prisma.trainingSession.create({
        data: {
          courseId: course.id,
          trainerId: trainerRecords[i].id,
          startsAt,
          endsAt,
          location,
          capacity: 20,
        },
      });

      sessionRecords.push(record);
    }
  }

  // 5. Inscriptions : deux formations par apprenant
  for (let i = 0; i < learnerRecords.length; i++) {
    const learner = learnerRecords[i];

    const courseIndexes = [
      i % courseRecords.length,
      (i + 3) % courseRecords.length,
    ];

    for (const courseIndex of courseIndexes) {
      await prisma.enrollment.upsert({
        where: {
          studentId_courseId: {
            studentId: learner.id,
            courseId: courseRecords[courseIndex].id,
          },
        },
        update: {},
        create: {
          studentId: learner.id,
          courseId: courseRecords[courseIndex].id,
          status: i % 5 === 0 ? "PENDING" : "CONFIRMED",
          progress: (i * 7) % 101,
        },
      });
    }
  }

  // 6. Présences : uniquement pour les apprenants inscrits
  for (const session of sessionRecords) {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: session.courseId,
        status: "CONFIRMED",
      },
    });

    for (const enrollment of enrollments) {
      const status =
        enrollment.progress > 70
          ? "PRESENT"
          : enrollment.progress > 30
            ? "LATE"
            : "ABSENT";

      await prisma.attendance.upsert({
        where: {
          sessionId_studentId: {
            sessionId: session.id,
            studentId: enrollment.studentId,
          },
        },
        update: {},
        create: {
          sessionId: session.id,
          studentId: enrollment.studentId,
          status,
        },
      });
    }
  }

  // 7. Évaluations et notes
  for (const course of courseRecords) {
    for (const title of ["Contrôle continu", "Projet final"]) {
      const existing = await prisma.evaluation.findFirst({
        where: {
          courseId: course.id,
          title,
        },
      });

      const evaluation = existing ?? await prisma.evaluation.create({
        data: {
          courseId: course.id,
          title,
          maxScore: 20,
        },
      });

      const enrollments = await prisma.enrollment.findMany({
        where: {
          courseId: course.id,
          status: "CONFIRMED",
        },
      });

      for (const enrollment of enrollments) {
        const score = randomInt(8, 21);

        await prisma.grade.upsert({
          where: {
            evaluationId_studentId: {
              evaluationId: evaluation.id,
              studentId: enrollment.studentId,
            },
          },
          update: {},
          create: {
            evaluationId: evaluation.id,
            studentId: enrollment.studentId,
            score,
            status: score >= 10 ? "VALIDATED" : "FAILED",
          },
        });
      }
    }
  }

  // 8. Notifications
  for (const learner of learnerRecords) {
    const title = "Bienvenue sur IFAG";

    const existing = await prisma.notification.findFirst({
      where: {
        userId: learner.id,
        title,
      },
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          userId: learner.id,
          title,
          body: "Votre espace apprenant IFAG est disponible.",
          read: false,
        },
      });
    }
  }

  // 9. Paramètres
  const settings = [
    { key: `${SEED_PREFIX}.schoolName`, value: "IFAG Formation" },
    { key: `${SEED_PREFIX}.defaultCapacity`, value: 20 },
    { key: `${SEED_PREFIX}.academicYear`, value: "2026-2027" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log("Peuplement terminé.");

  const [
    userCount,
    trainerCount,
    learnerCount,
    courseCount,
    sessionCount,
    enrollmentCount,
    attendanceCount,
    evaluationCount,
    gradeCount,
    notificationCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "TRAINER" } }),
    prisma.user.count({ where: { role: "LEARNER" } }),
    prisma.course.count(),
    prisma.trainingSession.count(),
    prisma.enrollment.count(),
    prisma.attendance.count(),
    prisma.evaluation.count(),
    prisma.grade.count(),
    prisma.notification.count(),
  ]);

  console.table({
    utilisateurs: userCount,
    formateurs: trainerCount,
    apprenants: learnerCount,
    formations: courseCount,
    sessions: sessionCount,
    inscriptions: enrollmentCount,
    presences: attendanceCount,
    evaluations: evaluationCount,
    notes: gradeCount,
    notifications: notificationCount,
  });
}

main()
  .catch((error: unknown) => {
    console.error("Erreur pendant le peuplement :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });