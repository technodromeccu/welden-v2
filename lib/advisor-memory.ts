export function mergePublicAdvisorMemorySummary(previousSummary: string | null | undefined, latestEntry: string) {
  const lines = [
    ...(previousSummary?.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? []),
    ...latestEntry.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  ];
  return Array.from(new Set(lines)).slice(-8).join("\n");
}
