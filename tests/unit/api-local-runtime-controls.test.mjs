import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

function extractFunctionSource(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `expected ${signature} to exist`);
  const parenStart = source.indexOf("(", start);
  let parenDepth = 0;
  let bodyStart = -1;
  for (let index = parenStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") parenDepth += 1;
    if (char === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        bodyStart = source.indexOf("{", index);
        break;
      }
    }
  }
  assert.ok(bodyStart >= 0, `expected ${signature} body to exist`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`could not extract ${signature}`);
}

function loadServerSource() {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  return fs.readFileSync(path.join(repoRoot, "apps/api/src/server.mjs"), "utf8");
}

function loadLocalRuntimeControlHelpers(processLike = { env: {} }) {
  const source = loadServerSource();
  const helperSource = [
    extractFunctionSource(source, "function hostWithoutPort("),
    extractFunctionSource(source, "function isLoopbackHost("),
    extractFunctionSource(source, "function isLoopbackRemoteAddress("),
    extractFunctionSource(source, "function isAllowedLocalOrigin("),
    extractFunctionSource(source, "function isAllowedLocalRuntimeControlOrigin("),
    extractFunctionSource(source, "function assertLocalRuntimeControlAllowed(")
  ].join("\n");
  return new Function("net", "process", `${helperSource}\nreturn { isAllowedLocalOrigin, isAllowedLocalRuntimeControlOrigin, assertLocalRuntimeControlAllowed };`)(net, processLike);
}

test("local runtime control origin guard only accepts real loopback origins", () => {
  const { isAllowedLocalOrigin } = loadLocalRuntimeControlHelpers();

  assert.equal(isAllowedLocalOrigin("http://127.0.0.1:5174"), true);
  assert.equal(isAllowedLocalOrigin("http://localhost:5174"), true);
  assert.equal(isAllowedLocalOrigin("http://app.localhost:5174"), true);
  assert.equal(isAllowedLocalOrigin("http://[::1]:5174"), true);

  assert.equal(isAllowedLocalOrigin("https://127.evil.example"), false);
  assert.equal(isAllowedLocalOrigin("https://127.0.0.1.example.com"), false);
  assert.equal(isAllowedLocalOrigin("null"), false);
  assert.equal(isAllowedLocalOrigin("https://example.com"), false);
});

test("local runtime control request guard requires loopback socket and local origin", () => {
  const { assertLocalRuntimeControlAllowed } = loadLocalRuntimeControlHelpers();

  assert.doesNotThrow(() => assertLocalRuntimeControlAllowed({
    headers: {
      origin: "http://127.0.0.1:5174",
      host: "127.0.0.1:3999",
      "x-yansilu-local-runtime-control": "1"
    },
    socket: { remoteAddress: "::ffff:127.0.0.1" }
  }));
  assert.throws(
    () => assertLocalRuntimeControlAllowed({
      headers: {
        origin: "https://127.evil.example",
        host: "127.0.0.1:3999",
        "x-yansilu-local-runtime-control": "1"
      },
      socket: { remoteAddress: "127.0.0.1" }
    }),
    /Yansilu local app origin/
  );
  assert.throws(
    () => assertLocalRuntimeControlAllowed({
      headers: {
        origin: "http://127.0.0.1:5174",
        host: "127.0.0.1:3999",
        "x-yansilu-local-runtime-control": "1"
      },
      socket: { remoteAddress: "10.0.0.4" }
    }),
    /this computer/
  );
  assert.throws(
    () => assertLocalRuntimeControlAllowed({
      headers: { origin: "http://127.0.0.1:5174", host: "127.0.0.1:3999" },
      socket: { remoteAddress: "127.0.0.1" }
    }),
    /runtime-control header/
  );
});

test("local runtime control origin guard rejects arbitrary localhost ports", () => {
  const { isAllowedLocalRuntimeControlOrigin } = loadLocalRuntimeControlHelpers();

  assert.equal(isAllowedLocalRuntimeControlOrigin("http://127.0.0.1:3999", "127.0.0.1:3999"), true);
  assert.equal(isAllowedLocalRuntimeControlOrigin("http://127.0.0.1:5174", "127.0.0.1:3999"), true);
  assert.equal(isAllowedLocalRuntimeControlOrigin("http://localhost:7777", "127.0.0.1:3999"), false);
});

test("Ollama local runtime mutation endpoints are protected by the local runtime guard", () => {
  const source = loadServerSource();
  const routePaths = [
    "/api/v1/ai/local-runtimes/ollama/start",
    "/api/v1/ai/local-runtimes/ollama/stop",
    "/api/v1/ai/local-runtimes/ollama/pull-model"
  ];

  for (const routePath of routePaths) {
    const routeStart = source.indexOf(`url.pathname === "${routePath}"`);
    assert.ok(routeStart >= 0, `expected ${routePath} route to exist`);
    const nextRoute = source.indexOf('if (req.method ===', routeStart + routePath.length);
    assert.ok(nextRoute > routeStart, `expected next route after ${routePath}`);
    const routeSource = source.slice(routeStart, nextRoute);

    assert.match(routeSource, /assertLocalRuntimeControlAllowed\(req\);/);
    assert.match(routeSource, /error\?\.status \|\|/);
  }
});

test("Ollama start probes common installed binary paths before falling back to PATH", () => {
  const source = loadServerSource();
  const resolverSource = extractFunctionSource(source, "async function resolveOllamaCommand(");
  const startSource = extractFunctionSource(source, "async function startOllamaRuntime(");

  assert.match(resolverSource, /OLLAMA_BIN/);
  assert.match(resolverSource, /LOCALAPPDATA/);
  assert.match(resolverSource, /Programs[\s\S]*Ollama[\s\S]*ollama\.exe/);
  assert.match(resolverSource, /ProgramFiles/);
  assert.match(resolverSource, /command: "ollama"/);
  assert.match(startSource, /const ollamaCommand = await resolveOllamaCommand\(\);/);
  assert.match(startSource, /spawn\(ollamaCommand\.command, \["serve"\]/);
});
