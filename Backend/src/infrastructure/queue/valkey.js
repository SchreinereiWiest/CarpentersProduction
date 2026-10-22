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
