const parsedVersion = raw => Math.max(0, Math.floor(Number(raw?.version) || 0));

export function loadStoredState(storage, {
  primaryKey,
  backupKey,
  targetVersion,
  migrate,
  requiresMigration
}) {
  if (!storage || typeof migrate !== "function") return null;
  for (const sourceKey of [primaryKey, backupKey]) {
    let rawText;
    let raw;
    try {
      rawText = storage.getItem(sourceKey);
      if (!rawText) continue;
      raw = JSON.parse(rawText);
    } catch {
      continue;
    }

    const needsMigration = parsedVersion(raw) < targetVersion || Boolean(requiresMigration?.(raw, targetVersion));
    if (needsMigration && sourceKey === primaryKey) {
      // The exact pre-migration payload is the recovery point.
      storage.setItem(backupKey, rawText);
    }
    return {
      state: migrate(raw),
      sourceKey,
      migratedFromVersion: needsMigration ? parsedVersion(raw) : null,
      preserveBackupOnWrite: needsMigration || sourceKey === backupKey,
      shouldRewritePrimary: needsMigration || sourceKey === backupKey
    };
  }
  return null;
}
