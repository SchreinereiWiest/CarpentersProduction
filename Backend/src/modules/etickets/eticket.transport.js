import net from "node:net";

const transportError = (message, statusCode, code) => Object.assign(new Error(message), { statusCode, code });

export function sendRawPrintJob({ host, port, timeoutMs, content }, connect = net.createConnection) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;
    const finish = error => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const socket = connect({ host, port });
    timer = setTimeout(() => {
      socket.destroy();
      finish(transportError("Der Etikettendrucker hat nicht rechtzeitig geantwortet.", 504, "ETICKET_PRINTER_TIMEOUT"));
    }, timeoutMs);

    socket.once("connect", () => socket.end(content, "utf8"));
    socket.once("error", error => finish(transportError(
      `Etikettendrucker nicht erreichbar: ${error.message}`,
      502,
      "ETICKET_PRINTER_UNREACHABLE"
    )));
    socket.once("close", hadError => {
      if (!hadError) finish();
    });
  });
}
