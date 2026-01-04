import { prisma } from "./prisma.js";
import { randomBytes } from "node:crypto";

export interface ApiKey {
  key: string;
  jobKey: string;
  keyPrefix: string;
}

function genKey(): { key: string; keyPrefix: string } {
  const raw = randomBytes(32).toString("hex");
  const key = `key_${raw}`;
  const keyPrefix = key.slice(0, 12);
  return { key, keyPrefix };
}

export async function createApiKey(jobKey: string): Promise<ApiKey> {
  for (let i = 0; i < 3; i++) {
    const { key, keyPrefix } = genKey();
    try {
      const created = await prisma.apiKey.create({
        data: { key, jobKey, keyPrefix },
        select: { key: true, jobKey: true, keyPrefix: true },
      });
      return created;
    } catch (e: any) {
      if (i === 2) throw e;
    }
  }
  throw new Error("could not create api key");
}

export async function getApiKey(key: string): Promise<ApiKey | undefined> {
  const found = await prisma.apiKey.findUnique({
    where: { key },
    select: { key: true, jobKey: true, keyPrefix: true, revokedAt: true },
  });

  if (!found) return undefined;
  if (found.revokedAt) return undefined;

  // lastUsedAt aktualisieren (fire & forget)
  prisma.apiKey
    .update({
      where: { key },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return { key: found.key, jobKey: found.jobKey, keyPrefix: found.keyPrefix };
}

export async function listApiKeys(): Promise<
  Array<{
    id: string;
    jobKey: string;
    keyPrefix: string;
    createdAt: Date;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
  }>
> {
  return prisma.apiKey.findMany({
    select: {
      id: true,
      jobKey: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeApiKey(id: string): Promise<void> {
  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}
