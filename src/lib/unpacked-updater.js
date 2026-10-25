/**
 * Automatic Extension Release Checker & Verified Unpacked Folder Updater
 * (`src/lib/unpacked-updater.js`).
 *
 * Works across the MV3 Background Service Worker, Popup, Options page, and
 * Node 22 tests using WebCrypto (`SHA-256`), `DecompressionStream("deflate-raw")`,
 * CRC-32 verification, and IndexedDB-persisted `FileSystemDirectoryHandle`.
 */

const IDB_NAME = "lmsubs_updater_db";
const IDB_STORE = "handles";
const IDB_DIR_KEY = "extension_root_dir";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function computeCrc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function compareSemver(a, b) {
  const pa = String(a || "0.0.0")
    .replace(/^v/i, "")
    .split("-")[0]
    .split(".")
    .map((n) => Number.parseInt(n, 10) || 0);
  const pb = String(b || "0.0.0")
    .replace(/^v/i, "")
    .split("-")[0]
    .split(".")
    .map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export function isRemoteReleaseNewer({
  localVersion = "0.0.0",
  localBuildId = "",
  remoteVersion = "0.0.0",
  remoteBuildId = "",
} = {}) {
  if (!remoteVersion) return false;
  const cmp = compareSemver(remoteVersion, localVersion);
  if (cmp > 0) return true;
  if (cmp < 0) return false;
  if (
    localBuildId &&
    remoteBuildId &&
    String(localBuildId).trim() !== String(remoteBuildId).trim()
  ) {
    return true;
  }
  return false;
}

export async function computeSha256Hex(inputBytes) {
  const u8 =
    inputBytes instanceof Uint8Array
      ? inputBytes
      : new Uint8Array(inputBytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", u8);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifySha256Hex(inputBytes, expectedHex) {
  if (!expectedHex) return true;
  const actual = await computeSha256Hex(inputBytes);
  return actual.toLowerCase() === String(expectedHex).trim().toLowerCase();
}

async function inflateRawBytes(compressedBytes) {
  if (typeof globalThis.DecompressionStream !== "function") {
    throw new Error("DecompressionStream is unavailable in this environment.");
  }
  const ds = new globalThis.DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  writer.write(compressedBytes);
  writer.close();
  const res = new Response(ds.readable);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

function sanitizeZipRelativePath(rawName) {
  const normalized = String(rawName || "").replace(/\\/g, "/").trim();
  if (!normalized || normalized.endsWith("/")) return null;
  if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) {
    throw new Error(`Unsafe archive path rejected: ${rawName}`);
  }
  const parts = normalized.split("/").filter(Boolean);
  if (parts.some((p) => p === "." || p === "..")) {
    throw new Error(`Path traversal rejected in archive: ${rawName}`);
  }
  // Strip outer `lm-subs/` wrapper folder when present
  if (parts.length > 1 && parts[0] === "lm-subs") {
    return parts.slice(1).join("/");
  }
  return parts.join("/");
}

/**
 * Extracts and CRC-verifies all files from an `lm-subs` release `.zip` buffer.
 */
export async function extractZipArchive(zipInput) {
  const bytes =
    zipInput instanceof Uint8Array ? zipInput : new Uint8Array(zipInput);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Locate End of Central Directory (0x06054b50) from tail
  let eocdOffset = -1;
  const minPos = Math.max(0, bytes.byteLength - 65557);
  for (let pos = bytes.byteLength - 22; pos >= minPos; pos--) {
    if (view.getUint32(pos, true) === 0x06054b50) {
      eocdOffset = pos;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error("Invalid update package: ZIP central directory not found.");
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralDirOffset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder("utf-8");

  const files = [];
  let cursor = centralDirOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (cursor + 46 > bytes.byteLength || view.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error("Invalid update package: corrupted central directory header.");
    }
    const method = view.getUint16(cursor + 10, true);
    const expectedCrc = view.getUint32(cursor + 16, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLen = view.getUint16(cursor + 28, true);
    const extraLen = view.getUint16(cursor + 30, true);
    const commentLen = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);

    const rawName = decoder.decode(
      bytes.subarray(cursor + 46, cursor + 46 + nameLen)
    );
    cursor += 46 + nameLen + extraLen + commentLen;

    const relPath = sanitizeZipRelativePath(rawName);
    if (!relPath) continue;

    if (
      localHeaderOffset + 30 > bytes.byteLength ||
      view.getUint32(localHeaderOffset, true) !== 0x04034b50
    ) {
      throw new Error(`Invalid local header for ${relPath}`);
    }
    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.byteLength) {
      throw new Error(`Truncated archive payload for ${relPath}`);
    }

    const slice = bytes.subarray(dataStart, dataEnd);
    let outBytes;
    if (method === 0) {
      outBytes = new Uint8Array(slice);
    } else if (method === 8) {
      outBytes = await inflateRawBytes(slice);
    } else {
      throw new Error(`Unsupported ZIP compression method ${method} for ${relPath}`);
    }

    if (outBytes.byteLength !== uncompressedSize) {
      throw new Error(`Size mismatch while extracting ${relPath}`);
    }
    const actualCrc = computeCrc32(outBytes);
    if (actualCrc !== expectedCrc) {
      throw new Error(`CRC-32 integrity check failed for ${relPath}`);
    }

    files.push({ path: relPath, bytes: outBytes });
  }

  if (!files.some((f) => f.path === "manifest.json")) {
    throw new Error("Invalid extension archive: manifest.json missing.");
  }

  return files;
}

function openHandlesDb() {
  if (typeof globalThis.indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = globalThis.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveLinkedExtensionDirHandle(dirHandle) {
  const db = await openHandlesDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(dirHandle, IDB_DIR_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

export async function loadLinkedExtensionDirHandle() {
  const db = await openHandlesDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_DIR_KEY);
      req.onsuccess = () => {
        db.close();
        resolve(req.result || null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function clearLinkedExtensionDirHandle() {
  const db = await openHandlesDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(IDB_DIR_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

export async function inspectLinkedDirPermission(dirHandle) {
  if (!dirHandle) return { linked: false, permission: "none", folderName: "" };
  try {
    const perm = (await dirHandle.queryPermission?.({ mode: "readwrite" })) || "granted";
    return {
      linked: true,
      permission: perm,
      folderName: dirHandle.name || "lm-subs",
    };
  } catch {
    return {
      linked: true,
      permission: "prompt",
      folderName: dirHandle.name || "lm-subs",
    };
  }
}

async function resolveTargetExtensionDir(dirHandle) {
  try {
    await dirHandle.getFileHandle("manifest.json", { create: false });
    return dirHandle;
  } catch {
    // Check if user selected parent folder containing `lm-subs/manifest.json`
    try {
      const sub = await dirHandle.getDirectoryHandle("lm-subs", { create: false });
      await sub.getFileHandle("manifest.json", { create: false });
      return sub;
    } catch {
      throw new Error(
        "Selected folder does not contain LM Subs manifest.json. Select your unzipped lm-subs folder."
      );
    }
  }
}

/**
 * Verifies `zipBytes` (`SHA-256` + `CRC-32`) and writes all updated extension
 * files directly into `dirHandle`.
 */
export async function applyUpdateToDirectoryHandle(
  dirHandle,
  zipBytes,
  { expectedSha256 = "", requestPermission = false } = {}
) {
  if (!dirHandle) {
    throw new Error("No unpacked extension folder is linked yet.");
  }

  let perm = (await dirHandle.queryPermission?.({ mode: "readwrite" })) || "granted";
  if (perm !== "granted" && requestPermission && dirHandle.requestPermission) {
    perm = await dirHandle.requestPermission({ mode: "readwrite" });
  }
  if (perm !== "granted") {
    const err = new Error("Write permission is required to update the unpacked folder.");
    err.code = "PERMISSION_REQUIRED";
    throw err;
  }

  const shaOk = await verifySha256Hex(zipBytes, expectedSha256);
  if (!shaOk) {
    throw new Error("Update package SHA-256 verification failed.");
  }

  const targetDir = await resolveTargetExtensionDir(dirHandle);
  const entries = await extractZipArchive(zipBytes);

  for (const entry of entries) {
    const segments = entry.path.split("/").filter(Boolean);
    const fileName = segments.pop();
    let currentDir = targetDir;
    for (const seg of segments) {
      currentDir = await currentDir.getDirectoryHandle(seg, { create: true });
    }
    const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(entry.bytes);
    await writable.close();
  }

  const manifestEntry = entries.find((e) => e.path === "manifest.json");
  const updatedManifest = JSON.parse(new TextDecoder().decode(manifestEntry.bytes));
  return {
    ok: true,
    writtenFiles: entries.length,
    version: updatedManifest.version || "",
    folderName: targetDir.name || "lm-subs",
  };
}
