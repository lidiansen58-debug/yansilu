import test from "node:test";
import assert from "node:assert/strict";

import { renderMobileAccessDesktopPanel } from "../../apps/web/src/mobile-access-desktop-panel.js";

function renderPanel(overrides = {}) {
  return renderMobileAccessDesktopPanel({
    state: {
      item: {
        accessUrl: "http://192.168.1.2:5173/mobile",
        qrSvg: "<svg></svg>",
        pairing: {
          pairCode: "123456",
          expiresAt: "2026-07-06T12:00:00.000Z",
          ttlSeconds: 120
        },
        pendingRequests: [],
        devices: [],
        ...overrides.item
      },
      ...overrides.state
    }
  });
}

test("mobile access panel keeps allow connection in the first-screen pairing area", () => {
  const html = renderPanel({
    item: {
      pendingRequests: [
        {
          id: "req-1",
          deviceName: "iPhone",
          createdAt: "2026-07-06T11:59:00.000Z",
          clientHint: "Safari"
        }
      ]
    }
  });

  const qrIndex = html.indexOf("mobile-access-qr");
  const approvalIndex = html.indexOf("mobile-access-approval is-pending");
  const devicesIndex = html.indexOf("已配对设备");

  assert.ok(qrIndex >= 0, "QR area should render");
  assert.ok(approvalIndex > qrIndex, "approval area should appear beside the QR instructions");
  assert.ok(devicesIndex > approvalIndex, "approval should appear before lower device management");
  assert.match(html, /data-mobile-pair-confirm="req-1"/);
  assert.match(html, />允许连接<\/button>/);
});

test("mobile access panel shows where the allow button will appear before a phone scans", () => {
  const html = renderPanel();

  assert.match(html, /第 2 步：电脑允许连接/);
  assert.match(html, /扫码后，允许按钮会出现在这里/);
  assert.doesNotMatch(html, /待确认手机/);
});
