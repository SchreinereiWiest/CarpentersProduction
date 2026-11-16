import { EventEmitter } from "node:events";
import assert from "node:assert/strict";
import test from "node:test";

import { sendRawPrintJob } from "../src/modules/etickets/eticket.transport.js";

class FakeSocket extends EventEmitter {
  end(content, encoding) {
    this.content = content;
    this.encoding = encoding;
    queueMicrotask(() => this.emit("close", false));
  }
  destroy() {
    this.destroyed = true;
  }
}

test("Netzwerkdruck überträgt den vollständigen Rohauftrag an Host und Port", async () => {
  const socket = new FakeSocket();
  let target;
  await sendRawPrintJob({ host: "printer.local", port: 9100, timeoutMs: 100, content: "^XA^XZ" }, options => {
    target = options;
    queueMicrotask(() => socket.emit("connect"));
    return socket;
  });
  assert.deepEqual(target, { host: "printer.local", port: 9100 });
  assert.equal(socket.content, "^XA^XZ");
  assert.equal(socket.encoding, "utf8");
});

test("Druckerfehler werden als Gateway-Fehler klassifiziert", async () => {
  const socket = new FakeSocket();
  const result = sendRawPrintJob({ host: "missing", port: 9100, timeoutMs: 100, content: "data" }, () => {
    queueMicrotask(() => socket.emit("error", new Error("ECONNREFUSED")));
    return socket;
  });
  await assert.rejects(result, error => error.statusCode === 502 && error.code === "ETICKET_PRINTER_UNREACHABLE");
});
