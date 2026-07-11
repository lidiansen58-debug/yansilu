import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import {
  fetchJsonHealth,
  probeYansiluApiPort,
  resolveYansiluApiPort,
  resolveYansiluWebPort
} from "../../scripts/dev-port-guard.mjs";

function listen(server, port = 0) {
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function jsonServer(payload, status = 200) {
  return http.createServer((req, res) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(typeof payload === "function" ? payload(req) : payload));
  });
}

test("fetchJsonHealth reads a lightweight health response", async () => {
  const server = jsonServer({ app: "yansilu", ok: true, pid: 123, port: 0 });
  const port = await listen(server);
  try {
    const result = await fetchJsonHealth(`http://127.0.0.1:${port}`, { timeoutMs: 500 });
    assert.equal(result.ok, true);
    assert.equal(result.json.app, "yansilu");
  } finally {
    await close(server);
  }
});

test("probeYansiluApiPort recognizes a healthy Yansilu API", async () => {
  const server = jsonServer((req) => ({
    app: "yansilu",
    ok: req.url === "/api/v1/health",
    pid: process.pid,
    port: 0,
    vaultPath: "tmp",
    timestamp: new Date().toISOString()
  }));
  const port = await listen(server);
  try {
    const probe = await probeYansiluApiPort(port, { healthTimeoutMs: 500 });
    assert.equal(probe.listening, true);
    assert.equal(probe.healthy, true);
    assert.equal(probe.isYansilu, true);
  } finally {
    await close(server);
  }
});

test("resolveYansiluApiPort reuses a healthy Yansilu API", async () => {
  const server = jsonServer({ app: "yansilu", ok: true, pid: process.pid, port: 0 });
  const port = await listen(server);
  try {
    const plan = await resolveYansiluApiPort({ preferredPort: port, maxAttempts: 2, healthTimeoutMs: 500 });
    assert.equal(plan.action, "reuse");
    assert.equal(plan.port, port);
  } finally {
    await close(server);
  }
});

test("resolveYansiluApiPort skips a non-Yansilu service occupying the preferred port", async () => {
  const server = jsonServer({ app: "other", ok: true });
  const port = await listen(server);
  try {
    const plan = await resolveYansiluApiPort({ preferredPort: port, maxAttempts: 2, healthTimeoutMs: 500 });
    assert.equal(plan.action, "start");
    assert.equal(plan.port, port + 1);
  } finally {
    await close(server);
  }
});

test("resolveYansiluApiPort skips an unhealthy occupied port", async () => {
  const server = jsonServer({ app: "yansilu", ok: false }, 500);
  const port = await listen(server);
  try {
    const plan = await resolveYansiluApiPort({ preferredPort: port, maxAttempts: 2, healthTimeoutMs: 500 });
    assert.equal(plan.action, "start");
    assert.equal(plan.port, port + 1);
  } finally {
    await close(server);
  }
});

test("resolveYansiluWebPort only reuses web servers with the matching API base", async () => {
  const apiBase = "http://127.0.0.1:3101";
  const server = jsonServer({ app: "yansilu", ok: true, service: "web", apiBase: "http://127.0.0.1:3999" });
  const port = await listen(server);
  try {
    const plan = await resolveYansiluWebPort({ preferredPort: port, apiBase, maxAttempts: 2, healthTimeoutMs: 500 });
    assert.equal(plan.action, "start");
    assert.equal(plan.port, port + 1);
  } finally {
    await close(server);
  }
});
