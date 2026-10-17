const clientsByTenant = new Map();
let sequence = 0;

const writeEvent = (response, event, payload, id = null) => {
    if (id != null) response.write(`id: ${id}\n`);
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(payload)}\n\n`);
};

export const subscribeToFileChanges = (req, res) => {
    const tenantId = req.tenant.id;
    res.status(200);
    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
    });
    res.flushHeaders?.();
    res.write("retry: 5000\n\n");

    const clients = clientsByTenant.get(tenantId) ?? new Set();
    clients.add(res);
    clientsByTenant.set(tenantId, clients);
    writeEvent(res, "connected", { connected: true });

    const disconnect = () => {
        clearInterval(heartbeat);
        clients.delete(res);
        if (clients.size === 0) clientsByTenant.delete(tenantId);
    };
    const heartbeat = setInterval(() => {
        try {
            res.write(": heartbeat\n\n");
        } catch {
            disconnect();
        }
    }, 25_000);

    req.on("close", disconnect);
};

export const publishFileChange = ({ tenantId, ...change }) => {
    if (!tenantId) return 0;
    const clients = clientsByTenant.get(tenantId);
    if (!clients?.size) return 0;

    sequence += 1;
    const payload = {
        ...change,
        changedAt: new Date().toISOString()
    };
    for (const response of [...clients]) {
        if (response.destroyed || response.writableEnded) {
            clients.delete(response);
            continue;
        }
        try {
            writeEvent(response, "file-changed", payload, sequence);
        } catch {
            clients.delete(response);
        }
    }
    return clients.size;
};

export const getFileChangeClientCount = tenantId => clientsByTenant.get(tenantId)?.size ?? 0;
