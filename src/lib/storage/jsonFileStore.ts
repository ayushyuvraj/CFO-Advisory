import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Deterministically resolves the shared live data directory across both
 * `master` (`d:\Projects\CFO Advisory`) and `v2` (`d:\Projects\CFO Advisory\v2`).
 */
export function resolveDataDir(): string {
  if (process.env.CFO_DATA_DIR && process.env.CFO_DATA_DIR.trim()) {
    return path.resolve(process.env.CFO_DATA_DIR.trim());
  }
  const cwd = process.cwd();
  const baseName = path.basename(cwd).toLowerCase();
  const parentData = path.resolve(cwd, "..", "data");
  if (baseName === "v2" && fs.existsSync(/*turbopackIgnore: true*/ parentData)) {
    return parentData;
  }
  if (
    fs.existsSync(/*turbopackIgnore: true*/ parentData) &&
    fs.existsSync(
      /*turbopackIgnore: true*/ path.join(parentData, "cfo_products_registry.json")
    )
  ) {
    return parentData;
  }
  return path.resolve(cwd, "data");
}

export function ensureDataDir(): string {
  const dir = resolveDataDir();
  if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
    fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
  }
  return dir;
}

function sleepSync(ms: number): void {
  if (ms <= 0) return;
  try {
    const sab = new SharedArrayBuffer(4);
    const view = new Int32Array(sab);
    Atomics.wait(view, 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      // bounded short spin fallback
    }
  }
}

function isRetryableFsError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException)?.code;
  return (
    code === "EPERM" ||
    code === "EBUSY" ||
    code === "EACCES" ||
    code === "EEXIST" ||
    code === "ENOENT"
  );
}

/**
 * Acquires a cross-process lockfile (`O_EXCL`) with automatic stale-lock recovery
 * so concurrent writes across Ports 3000 & 3001 never lose updates or hit EPERM.
 */
export function withFileLock<T>(targetFile: string, fn: () => T): T {
  ensureDataDir();
  const lockFile = `${targetFile}.lock`;
  const maxAttempts = 60;
  const staleMs = 10_000;
  let acquired = false;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const fd = fs.openSync(lockFile, "wx");
      fs.writeSync(fd, `${process.pid}:${Date.now()}`);
      fs.closeSync(fd);
      acquired = true;
      break;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === "EEXIST" || code === "EPERM" || code === "EBUSY") {
        // Check if existing lock is stale
        try {
          const stat = fs.statSync(lockFile);
          if (Date.now() - stat.mtimeMs > staleMs) {
            fs.unlinkSync(lockFile);
            continue;
          }
        } catch {
          // Lock disappeared between open & stat, retry immediately
        }
        sleepSync(12 + Math.floor(Math.random() * 20));
        continue;
      }
      throw err;
    }
  }

  if (!acquired) {
    throw new Error(`Timed out waiting for storage lock on ${path.basename(targetFile)}.`);
  }

  try {
    return fn();
  } finally {
    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    } catch {
      // Ignore cleanup error
    }
  }
}

/**
 * Atomic write with `fsyncSync` + Windows `EPERM`/`EBUSY` rename retry loop
 * + last-known-good `.bak` snapshot.
 */
export function writeJsonAtomic(targetFile: string, data: unknown): void {
  ensureDataDir();
  const dir = path.dirname(targetFile);
  const base = path.basename(targetFile);
  const tmpFile = path.join(
    dir,
    `.${base}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`
  );
  const bakFile = `${targetFile}.bak`;
  const payload = JSON.stringify(data, null, 2);

  try {
    const fd = fs.openSync(tmpFile, "w");
    try {
      fs.writeFileSync(fd, payload, "utf8");
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }

    // Best-effort backup of previous good file
    try {
      if (fs.existsSync(targetFile)) {
        fs.copyFileSync(targetFile, bakFile);
      }
    } catch {
      // Non-fatal
    }

    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        fs.renameSync(tmpFile, targetFile);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        if (!isRetryableFsError(err)) throw err;
        sleepSync(15 + attempt * 12 + Math.floor(Math.random() * 15));
      }
    }
    if (lastErr) {
      throw lastErr;
    }
  } catch (err) {
    try {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    } catch {
      // Ignore temp cleanup failure
    }
    throw err;
  }
}

/**
 * Strict reader with transient Windows lock retries and `.bak` fallback only
 * when primary file is unreadable; NEVER silently returns empty data before a mutation.
 */
export function readJsonStrict<T>(
  targetFile: string,
  createInitial: () => T,
  validate: (parsed: unknown) => T
): T {
  ensureDataDir();
  if (!fs.existsSync(targetFile)) {
    const initial = createInitial();
    writeJsonAtomic(targetFile, initial);
    return initial;
  }

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const raw = fs.readFileSync(targetFile, "utf8");
      if (!raw.trim()) {
        throw new Error(`Storage file ${path.basename(targetFile)} is empty.`);
      }
      return validate(JSON.parse(raw));
    } catch (err) {
      lastErr = err;
      if (isRetryableFsError(err)) {
        sleepSync(12 + attempt * 10);
        continue;
      }
      break;
    }
  }

  // Attempt last-known-good backup recovery if primary was mid-crash corrupted
  const bakFile = `${targetFile}.bak`;
  if (fs.existsSync(bakFile)) {
    try {
      const rawBak = fs.readFileSync(bakFile, "utf8");
      if (rawBak.trim()) {
        return validate(JSON.parse(rawBak));
      }
    } catch {
      // Fall through to throwing original error
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error(`Failed to read storage file ${path.basename(targetFile)}.`);
}

export function mutateJsonFile<T, R>(
  targetFile: string,
  createInitial: () => T,
  validate: (parsed: unknown) => T,
  mutator: (current: T) => { next: T; result: R; skipWrite?: boolean }
): R {
  return withFileLock(targetFile, () => {
    const current = readJsonStrict(targetFile, createInitial, validate);
    const { next, result, skipWrite } = mutator(current);
    if (!skipWrite) {
      writeJsonAtomic(targetFile, next);
    }
    return result;
  });
}
