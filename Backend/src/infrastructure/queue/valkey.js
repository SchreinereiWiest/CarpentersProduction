import net from "node:net";

const encodeCommand = (parts) => {
  const values = parts.map((part) => Buffer.from(String(part)));
  return Buffer.concat([
    Buffer.from(`*${values.length}\r\n`),
    ...values.flatMap((value) => [
      Buffer.from(`$${value.length}\r\n`),
      value,
      Buffer.from("\r\n")
    ])
  ]);
};

/**
 * Sends the small subset of RESP commands needed for durable OCR enqueueing.
 * Keeping this adapter tiny avoids coupling the backend process to a worker
 * library; Valkey remains the shared protocol boundary.
 */
export async function pushValkeyJob(queue, payload, urlValue = process.env.VALKEY_URL) {
  const url = new URL(urlValue || "redis://valkey:6379/0");
  if (url.protocol !== "redis:") {
    throw new Error("VALKEY_URL must use the redis:// protocol");
  }

  const commands = [];
  if (url.password) {
    commands.push(url.username
      ? ["AUTH", decodeURIComponent(url.username), decodeURIComponent(url.password)]
      : ["AUTH", decodeURIComponent(url.password)]);
  }
  const database = Number.parseInt(url.pathname.slice(1) || "0", 10);
  if (database > 0) commands.push(["SELECT", database]);
  commands.push(["LPUSH", queue, JSON.stringify(payload)]);

  await new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: url.hostname,
      port: Number(url.port) || 6379
    });
    let replies = 0;
    let buffer = "";
    const fail = (error) => {
      socket.destroy();
      reject(error);
    };
    socket.setTimeout(5_000, () => fail(new Error("Valkey connection timed out")));
    socket.once("error", fail);
    socket.once("connect", () => {
      socket.write(Buffer.concat(commands.map(encodeCommand)));
    });
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\r\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line) continue;
        if (line.startsWith("-")) return fail(new Error(`Valkey error: ${line.slice(1)}`));
        if (line.startsWith("+") || line.startsWith(":")) replies += 1;
        if (replies === commands.length) {
          socket.end();
          resolve();
          return;
        }
      }
    });
  });
}

const findCrlf = (buffer, offset) => buffer.indexOf("\r\n", offset);

export function parseValkeyReply(buffer, offset = 0) {
  if (buffer.length <= offset) return null;
  const type = String.fromCharCode(buffer[offset]);
  const lineEnd = findCrlf(buffer, offset + 1);
  if (lineEnd < 0) return null;
  const line = buffer.subarray(offset + 1, lineEnd).toString("utf8");
  const next = lineEnd + 2;

  if (type === "+") return { value: line, offset: next };
  if (type === "-") return { error: new Error(`Valkey error: ${line}`), offset: next };
  if (type === ":") return { value: Number(line), offset: next };
  if (type === "$") {
    const length = Number(line);
    if (length === -1) return { value: null, offset: next };
    if (!Number.isSafeInteger(length) || buffer.length < next + length + 2) return null;
    return {
      value: buffer.subarray(next, next + length).toString("utf8"),
      offset: next + length + 2
    };
  }
  if (type === "*") {
    const length = Number(line);
    if (length === -1) return { value: null, offset: next };
    if (!Number.isSafeInteger(length) || length < 0) return null;
    const value = [];
    let childOffset = next;
    for (let index = 0; index < length; index += 1) {
      const child = parseValkeyReply(buffer, childOffset);
      if (!child) return null;
      if (child.error) return child;
      value.push(child.value);
      childOffset = child.offset;
    }
    return { value, offset: childOffset };
  }
  return { error: new Error("Valkey returned an unsupported RESP value"), offset: next };
}

const connectionCommands = url => {
  const commands = [];
  if (url.password) {
    commands.push(url.username
      ? ["AUTH", decodeURIComponent(url.username), decodeURIComponent(url.password)]
      : ["AUTH", decodeURIComponent(url.password)]);
  }
  const database = Number.parseInt(url.pathname.slice(1) || "0", 10);
  if (database > 0) commands.push(["SELECT", database]);
  return commands;
};

async function executeValkey(commands, {
  timeoutMs = 5_000,
  urlValue = process.env.VALKEY_URL
} = {}) {
  const url = new URL(urlValue || "redis://valkey:6379/0");
  if (url.protocol !== "redis:") throw new Error("VALKEY_URL must use the redis:// protocol");
  const allCommands = [...connectionCommands(url), ...commands];

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: url.hostname, port: Number(url.port) || 6379 });
    let buffer = Buffer.alloc(0);
    let offset = 0;
    const replies = [];
    const fail = error => {
      socket.destroy();
      reject(error);
    };
    socket.setTimeout(timeoutMs, () => fail(new Error("Valkey connection timed out")));
    socket.once("error", fail);
    socket.once("connect", () => socket.write(Buffer.concat(allCommands.map(encodeCommand))));
    socket.on("data", chunk => {
      buffer = Buffer.concat([buffer.subarray(offset), chunk]);
      offset = 0;
      while (replies.length < allCommands.length) {
        const parsed = parseValkeyReply(buffer, offset);
        if (!parsed) break;
        if (parsed.error) return fail(parsed.error);
        replies.push(parsed.value);
        offset = parsed.offset;
      }
      if (replies.length === allCommands.length) {
        socket.end();
        resolve(replies.slice(connectionCommands(url).length));
      }
    });
  });
}

/**
 * Enqueues one job while an expiring Valkey key prevents duplicate work for
 * the same tenant. Credentials never belong in the payload or lock key.
 */
export async function pushUniqueValkeyJob(queue, payload, {
  dedupeKey,
  ttlSeconds = 900,
  urlValue = process.env.VALKEY_URL
} = {}) {
  if (!dedupeKey) throw new Error("A dedupeKey is required");
  const script = [
    "if redis.call('SET', KEYS[1], '1', 'EX', ARGV[1], 'NX') then",
    "  return redis.call('LPUSH', KEYS[2], ARGV[2])",
    "end",
    "return 0"
  ].join("\n");
  const [result] = await executeValkey([
    ["EVAL", script, 2, dedupeKey, queue, ttlSeconds, JSON.stringify(payload)]
  ], { urlValue });
  return Number(result) > 0;
}

/** Claims a durable job by moving it to a processing list atomically. */
export async function claimValkeyJob(queue, processingQueue, {
  timeoutSeconds = 30,
  urlValue = process.env.VALKEY_URL
} = {}) {
  const [raw] = await executeValkey([
    ["BRPOPLPUSH", queue, processingQueue, timeoutSeconds]
  ], { timeoutMs: (timeoutSeconds + 5) * 1_000, urlValue });
  return raw;
}

/** Removes a completed claim and releases its tenant-level dedupe lock. */
export async function acknowledgeValkeyJob(processingQueue, raw, {
  dedupeKey,
  urlValue = process.env.VALKEY_URL
} = {}) {
  const commands = [["LREM", processingQueue, 1, raw]];
  if (dedupeKey) commands.push(["DEL", dedupeKey]);
  await executeValkey(commands, { urlValue });
}

/** Returns jobs left behind by a stopped worker to the ready queue. */
export async function recoverValkeyJobs(queue, processingQueue, urlValue = process.env.VALKEY_URL) {
  const [length] = await executeValkey([["LLEN", processingQueue]], { urlValue });
  if (!Number.isSafeInteger(length) || length <= 0) return 0;
  const commands = Array.from({ length }, () => ["RPOPLPUSH", processingQueue, queue]);
  await executeValkey(commands, { urlValue });
  return length;
}
