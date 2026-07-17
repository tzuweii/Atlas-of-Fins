const parsedVersion = raw => Math.max(0, Math.floor(Number(raw?.version) || 0));

export function loadStoredState(storage, {
  primaryKey,
  backupKey,
  temporaryKey,
  targetVersion,
  migrate,
  requiresMigration
}) {
  if (!storage || typeof migrate !== "function") return null;
  if (temporaryKey) {
    try { storage.removeItem(temporaryKey); } catch { /* stale staging data is never trusted */ }
  }
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

export function writeStoredState(storage, state, {
  primaryKey,
  backupKey,
  temporaryKey,
  preserveBackup = false,
  validate = () => true
}) {
  if (!storage || !primaryKey || !backupKey || !temporaryKey) return { ok: false, reason: "invalid-storage" };
  const originalPrimary = storage.getItem(primaryKey);
  const originalBackup = storage.getItem(backupKey);
  let candidate;
  try {
    candidate = JSON.stringify(state);
    storage.setItem(temporaryKey, candidate);
    const reparsed = JSON.parse(storage.getItem(temporaryKey));
    if (!validate(reparsed)) throw new Error("invalid-candidate");
    if (!preserveBackup && originalPrimary) storage.setItem(backupKey, originalPrimary);
    storage.setItem(primaryKey, candidate);
    storage.removeItem(temporaryKey);
    return { ok: true, bytes: new TextEncoder().encode(candidate).byteLength };
  } catch (error) {
    try {
      if (originalPrimary == null) storage.removeItem(primaryKey);
      else storage.setItem(primaryKey, originalPrimary);
      if (originalBackup == null) storage.removeItem(backupKey);
      else storage.setItem(backupKey, originalBackup);
      storage.removeItem(temporaryKey);
    } catch {
      // Best-effort rollback for storage engines that continue throwing.
    }
    return { ok: false, reason: String(error?.message || "write-failed") };
  }
}
