import type { JobRun as PrismaJobRun } from "@prisma/client";
import { prisma } from "./prisma.js";

export type JobStatus = "ok" | "fail";

export async function recordRun(input: {
  jobKey: string;
  status: JobStatus;
  message?: string;
}): Promise<PrismaJobRun> {
  const run = await prisma.jobRun.create({
    data: {
      jobKey: input.jobKey,
      status: input.status,
      message: input.message,
    },
  });

  return run;
}

export async function getLatestRun(jobKey: string): Promise<PrismaJobRun | undefined> {
  const latest = await prisma.jobRun.findFirst({
    where: { jobKey },
    orderBy: { createdAt: "desc" },
  });

  return latest ?? undefined;
}

export async function listRuns(jobKey?: string): Promise<PrismaJobRun[]> {
  const runs = await prisma.jobRun.findMany({
    where: jobKey ? { jobKey } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return runs;
}
