import type { JobConfig as PrismaJobConfig } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function createJobConfig(input: {
  jobKey: string;
  expectedEveryMinutes: number;
  graceMinutes: number;
}): Promise<PrismaJobConfig> {
  return prisma.jobConfig.create({
    data: {
      jobKey: input.jobKey,
      expectedEveryMinutes: input.expectedEveryMinutes,
      graceMinutes: input.graceMinutes,
    },
  });
}

export async function upsertJobConfig(input: {
  jobKey: string;
  expectedEveryMinutes: number;
  graceMinutes: number;
}): Promise<PrismaJobConfig> {
  return prisma.jobConfig.upsert({
    where: { jobKey: input.jobKey },
    create: {
      jobKey: input.jobKey,
      expectedEveryMinutes: input.expectedEveryMinutes,
      graceMinutes: input.graceMinutes,
    },
    update: {
      expectedEveryMinutes: input.expectedEveryMinutes,
      graceMinutes: input.graceMinutes,
    },
  });
}

export async function getJobConfig(
  jobKey: string
): Promise<PrismaJobConfig | undefined> {
  const cfg = await prisma.jobConfig.findUnique({
    where: { jobKey },
  });
  return cfg ?? undefined;
}

export async function listJobConfigs(): Promise<PrismaJobConfig[]> {
  return prisma.jobConfig.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteJobConfig(jobKey: string): Promise<void> {
  await prisma.jobConfig.delete({ where: { jobKey } });
}
