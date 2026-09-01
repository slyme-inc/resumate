export type LevelFit = "match" | "stretch" | "overqualified" | "under";

export type FitJudgement = {
  key: string;
  mustHavePassed: string[];
  mustHaveFailed: string[];
  niceToHavePassed: string[];
  levelFit: LevelFit;
  veto: string | null;
};

export type RerankCache = {
  version: 1;
  keys: string;
  judgements: FitJudgement[];
};

export function isFitJudgement(value: unknown): value is FitJudgement {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Partial<FitJudgement>;
  return typeof record.key === "string" && Array.isArray(record.mustHavePassed);
}

export function isRerankCache(value: unknown): value is RerankCache {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Partial<RerankCache>;
  return record.version === 1 && typeof record.keys === "string" && Array.isArray(record.judgements);
}
