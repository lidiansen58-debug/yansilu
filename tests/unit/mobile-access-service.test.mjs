import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createMobileQuickNote,
  getMobileNote,
  handleMobileApiRequest,
  listMobilePermanentNotes
} from "../../apps/api/src/mobile-access-service.mjs";
import {
  MOBILE_PAIRING_TESTING,
  assertMobileTokenAllowed,
  buildDesktopMobileAccessStatus,
  confirmPairRequest,
  createPairRequest,
  getPairRequestStatus,
  resolveLanIpv4FromInterfaces,
  revokeMobileDevice
} from "../../apps/api/src/mobile-pairing-service.mjs";

async function withTempVault(fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-mobile-test-"));
  try {
    await fn(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("desktop QR payload contains only address and short pair code, not long token", async () => {
  await withTempVault(async (vaultPath) => {
    const status = await buildDesktopMobileAccessStatus(vaultPath, {
      env: { MOBILE_ACCESS_URL: "http://192.168.1.10:5173/mobile" }
    });

    assert.equal(status.accessUrl, "http://192.168.1.10:5173/mobile");
    assert.match(status.pairing.pairCode, /^\d{6}$/);
    assert.match(status.pairUrl, /pairCode=\d{6}/);
    assert.doesNotMatch(status.pairUrl, /ym_/);
    assert.match(status.qrSvg, /<svg/);
  });
});

test("mobile access URL prefers real LAN addresses over virtual proxy adapters", () => {
  const address = resolveLanIpv4FromInterfaces({
    "vEthernet (Default Switch)": [
      { family: "IPv4", internal: false, address: "172.25.208.1" }
    ],
    WLAN: [
      { family: "IPv4", internal: false, address: "192.168.12.203" }
    ],
    Mihomo: [
      { family: "IPv4", internal: false, address: "198.18.0.1" }
    ],
    Loopback: [
      { family: "IPv4", internal: true, address: "127.0.0.1" }
    ]
  });

  assert.equal(address, "192.168.12.203");
});

test("desktop mobile access control rejection logs request diagnostics", async () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(String(message));
  try {
    const response = await handleMobileApiRequest({
      req: {
        method: "GET",
        url: "/api/v1/mobile/desktop/status",
        headers: {
          origin: "https://tauri.localhost",
          host: "127.0.0.1:3000",
          "x-yansilu-local-runtime-control": "1"
        },
        socket: { remoteAddress: "::1" }
      },
      res: {},
      url: new URL("http://127.0.0.1:3000/api/v1/mobile/desktop/status"),
      sendJson: (_res, status, body) => ({ status, body }),
      readJson: async () => ({}),
      err: (code, message, requestId, details) => ({ error: { code, message, details }, requestId }),
      requestId: "req-control-denied",
      vaultPath: "vault",
      deps: { initVault: async () => {} },
      assertDesktopControlAllowed: () => {
        const error = new Error("local runtime controls only accept the Yansilu local app origin");
        error.code = "LOCAL_RUNTIME_CONTROL_ORIGIN_DENIED";
        error.status = 403;
        error.details = {
          origin: "https://tauri.localhost",
          host: "127.0.0.1:3000",
          remoteAddress: "::1",
          method: "GET",
          path: "/api/v1/mobile/desktop/status"
        };
        throw error;
      }
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, "LOCAL_RUNTIME_CONTROL_ORIGIN_DENIED");
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /Mobile desktop control rejected/);
    assert.match(warnings[0], /https:\/\/tauri\.localhost/);
    assert.match(warnings[0], /req-control-denied/);
  } finally {
    console.warn = originalWarn;
  }
});

test("expired pair code cannot create a mobile pair request", async () => {
  await withTempVault(async (vaultPath) => {
    const status = await buildDesktopMobileAccessStatus(vaultPath);
    const key = path.resolve(vaultPath);
    const session = MOBILE_PAIRING_TESTING.pairingSessionsByVault.get(key);
    session.expiresAtMs = Date.now() - 1000;

    await assert.rejects(
      () => createPairRequest(vaultPath, { pairCode: status.pairing.pairCode, deviceName: "iPhone" }),
      /配对码无效或已过期/
    );
  });
});

test("mobile token is unavailable before desktop confirmation, then works until revoked", async () => {
  await withTempVault(async (vaultPath) => {
    const status = await buildDesktopMobileAccessStatus(vaultPath);
    const created = await createPairRequest(vaultPath, {
      pairCode: status.pairing.pairCode,
      deviceName: "iPhone"
    });

    const pending = getPairRequestStatus(vaultPath, created.request.id, created.requestSecret);
    assert.equal(pending.request.status, "pending");
    assert.equal(pending.token, "");

    await assert.rejects(() => assertMobileTokenAllowed(vaultPath, ""), /需要先完成电脑端确认配对/);

    const confirmed = await confirmPairRequest(vaultPath, created.request.id);
    assert.equal(confirmed.request.status, "confirmed");
    assert.equal(confirmed.device.status, "active");

    const withToken = getPairRequestStatus(vaultPath, created.request.id, created.requestSecret);
    assert.match(withToken.token, /^ym_/);

    const device = await assertMobileTokenAllowed(vaultPath, withToken.token);
    assert.equal(device.name, "iPhone");

    await revokeMobileDevice(vaultPath, device.id);
    await assert.rejects(() => assertMobileTokenAllowed(vaultPath, withToken.token), /已失效/);
  });
});

test("mobile permanent notes use search when the user enters a query", async () => {
  const result = await listMobilePermanentNotes(
    "vault",
    { query: "写作", limit: 5 },
    {
      initVault: async () => {},
      listNotesInDirectory: async () => {
        throw new Error("list should not be used for search");
      },
      searchNotes: async (_vaultPath, input) => ({
        ...input,
        total: 1,
        items: [{ id: "n2", noteType: "permanent", title: "写作中心", updatedAt: "2026-07-04T10:00:00.000Z" }]
      })
    }
  );

  assert.equal(result.query, "写作");
  assert.equal(result.total, 1);
  assert.equal(result.items[0].title, "写作中心");
});

test("mobile quick note only writes after an explicit save action", async () => {
  const created = await createMobileQuickNote(
    "vault",
    { body: "手机里先记下一个想法", excerpt: "一段网页摘录" },
    {
      initVault: async () => {},
      createNoteInDirectory: async (_vaultPath, input) => ({
        id: "f2",
        noteType: "fleeting",
        title: input.title,
        status: input.status,
        directoryId: input.directoryId,
        body: input.body,
        updatedAt: "2026-07-04T10:00:00.000Z"
      })
    }
  );

  assert.equal(created.directoryId, "dir_fleeting_default");
  assert.equal(created.noteType, "fleeting");
  assert.equal(created.title, "手机里先记下一个想法");
});

test("mobile quick note saves phone images as note assets and appends markdown links", async () => {
  const calls = {
    createdBody: "",
    savedAsset: null,
    updatedBody: ""
  };
  const created = await createMobileQuickNote(
    "vault",
    {
      title: "拍照素材",
      body: "现场白板值得回电脑整理。",
      images: [
        {
          fileName: "white[board].jpg",
          mimeType: "image/jpeg",
          contentBase64: Buffer.from("fake image").toString("base64")
        }
      ]
    },
    {
      initVault: async () => {},
      createNoteInDirectory: async (_vaultPath, input) => {
        calls.createdBody = input.body;
        return {
          id: "f3",
          noteType: "fleeting",
          title: input.title,
          status: input.status,
          directoryId: input.directoryId,
          body: input.body,
          updatedAt: "2026-07-04T10:00:00.000Z"
        };
      },
      saveNoteAsset: async (_vaultPath, noteId, input) => {
        calls.savedAsset = { noteId, ...input };
        return {
          noteId,
          assetKind: "image",
          fileName: input.fileName,
          markdownLinkPath: "../../assets/images/f3/whiteboard.jpg"
        };
      },
      updateNoteContent: async (_vaultPath, noteId, input) => {
        calls.updatedBody = input.body;
        return {
          id: noteId,
          noteType: "fleeting",
          title: input.title,
          status: input.status,
          directoryId: "dir_fleeting_default",
          body: input.body,
          updatedAt: "2026-07-04T10:00:00.000Z"
        };
      }
    }
  );

  assert.equal(created.id, "f3");
  assert.equal(calls.savedAsset.noteId, "f3");
  assert.equal(calls.savedAsset.kind, "image");
  assert.equal(calls.savedAsset.mimeType, "image/jpeg");
  assert.match(calls.createdBody, /现场白板/);
  assert.match(calls.updatedBody, /## 手机图片/);
  assert.match(calls.updatedBody, /!\[white\\\[board\\\]\.jpg\]\(\.\.\/\.\.\/assets\/images\/f3\/whiteboard\.jpg\)/);
});

test("mobile note detail stays scoped to permanent notes", async () => {
  await assert.rejects(
    () =>
      getMobileNote("vault", "f1", {
        initVault: async () => {},
        getNoteById: async () => ({
          id: "f1",
          noteType: "fleeting",
          title: "手机随笔",
          body: "暂不在手机详情里开放"
        })
      }),
    /只开放永久笔记/
  );

  const item = await getMobileNote("vault", "n1", {
    initVault: async () => {},
    getNoteById: async () => ({
      id: "n1",
      noteType: "permanent",
      title: "永久笔记",
      body: "可以在手机端查看"
    })
  });
  assert.equal(item.noteType, "permanent");
  assert.equal(item.body, "可以在手机端查看");
});
