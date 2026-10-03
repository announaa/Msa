import { db } from "@/lib/db";

function average(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

export type SubjectSummary = {
  subjectId: string;
  subjectName: string;
  average: number;
  trend: number; // latest assessment minus the one before it, in points
  topics: { topic: string; average: number }[];
};

// One card per subject the student has any assessments in — average,
// trend (latest vs previous assessment, matching the "Math 71% ↑ 6%"
// example in the brief), and a Strongest/Needs Support topic breakdown.
export async function getSubjectSummaries(studentId: string): Promise<SubjectSummary[]> {
  const assessments = await db.assessment.findMany({
    where: { studentId },
    include: { subject: true },
    orderBy: { gradedAt: "asc" },
  });

  const bySubject = new Map<string, { name: string; rows: typeof assessments }>();
  for (const a of assessments) {
    const entry = bySubject.get(a.subjectId) ?? { name: a.subject.name, rows: [] };
    entry.rows.push(a);
    bySubject.set(a.subjectId, entry);
  }

  const summaries: SubjectSummary[] = [];
  for (const [subjectId, { name, rows }] of bySubject) {
    const scores = rows.map((r) => r.scorePercent);
    const trend = scores.length >= 2 ? scores[scores.length - 1] - scores[scores.length - 2] : 0;

    const byTopic = new Map<string, number[]>();
    for (const r of rows) {
      byTopic.set(r.topic, [...(byTopic.get(r.topic) ?? []), r.scorePercent]);
    }
    const topics = Array.from(byTopic.entries())
      .map(([topic, topicScores]) => ({ topic, average: average(topicScores) }))
      .sort((a, b) => b.average - a.average);

    summaries.push({ subjectId, subjectName: name, average: average(scores), trend, topics });
  }

  return summaries.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

// "Before joining MSA" vs "Current": each subject's very first recorded
// assessment vs. the average of its most recent 3. Simplified vs. a
// dedicated baseline field — documented in README.
export async function getBeforeAfter(studentId: string): Promise<{ before: number; after: number } | null> {
  const assessments = await db.assessment.findMany({
    where: { studentId },
    orderBy: { gradedAt: "asc" },
  });
  if (assessments.length === 0) return null;

  const bySubject = new Map<string, number[]>();
  for (const a of assessments) {
    bySubject.set(a.subjectId, [...(bySubject.get(a.subjectId) ?? []), a.scorePercent]);
  }

  const befores: number[] = [];
  const afters: number[] = [];
  for (const scores of bySubject.values()) {
    befores.push(scores[0]);
    afters.push(average(scores.slice(-3)));
  }

  return { before: average(befores), after: average(afters) };
}

// Call after every new Assessment is inserted. Opens an AcademicAlert if
// the student's last 3 assessments in that subject strictly declined and
// there isn't already an open alert for the same student+subject (avoids
// spamming one per additional bad grade).
export async function checkAcademicDecline(studentId: string, subjectId: string) {
  const recent = await db.assessment.findMany({
    where: { studentId, subjectId },
    orderBy: { gradedAt: "desc" },
    take: 3,
    include: { subject: true },
  });
  if (recent.length < 3) return null;

  const [latest, middle, earliest] = recent;
  const declining = latest.scorePercent < middle.scorePercent && middle.scorePercent < earliest.scorePercent;
  if (!declining) return null;

  const existing = await db.academicAlert.findFirst({
    where: { studentId, subjectId, status: "OPEN" },
  });
  if (existing) return existing;

  return db.academicAlert.create({
    data: {
      studentId,
      subjectId,
      message: `${latest.subject.name}: declined 3 assessments in a row (${earliest.scorePercent}% \u2192 ${middle.scorePercent}% \u2192 ${latest.scorePercent}%)`,
    },
  });
}
