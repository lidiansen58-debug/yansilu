import test from "node:test";
import assert from "node:assert/strict";

import { renderMobileAccessDesktopPanel } from "../../apps/web/src/mobile-access-desktop-panel.js";
import {
  prepareMobileAccessAutoRefreshState,
  shouldAutoRefreshMobileAccess,
  shouldPromoteMobileAccessRefreshRender
} from "../../apps/web/src/mobile-access-settings-refresh.js";

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

test("mobile access panel keeps the waiting state concise before a phone scans", () => {
  const html = renderPanel();

  assert.match(html, /手机和电脑需要连接同一个 Wi-Fi/);
  assert.match(html, /这个地址绑定在当前 Wi-Fi 网络上/);
  assert.match(html, /等待连接/);
  assert.match(html, /扫码后在这里允许连接/);
  assert.doesNotMatch(html, /手机发起连接请求后，不需要往下找/);
  assert.doesNotMatch(html, /待确认手机/);
});

test("mobile access panel hides internal local runtime errors", () => {
  const html = renderPanel({
    item: null,
    state: {
      error: "local runtime controls only accept the Yansilu local app origin"
    }
  });

  assert.match(html, /手机访问只能从这台电脑上的研思录打开/);
  assert.doesNotMatch(html, /local runtime controls/);
  assert.doesNotMatch(html, /Yansilu local app origin/);
});

test("mobile access settings auto-refreshes a stale error when opened", () => {
  const state = {
    item: null,
    loading: false,
    error: "手机访问只能从这台电脑上的研思录打开。"
  };

  assert.equal(shouldAutoRefreshMobileAccess({
    active: true,
    item: state.item,
    loading: state.loading,
    refreshTimer: 0,
    autoRefreshQueued: false,
    error: state.error,
    attemptedAfterError: false
  }), true);

  assert.equal(prepareMobileAccessAutoRefreshState(state), true);
  assert.deepEqual(state, {
    item: null,
    loading: true,
    error: ""
  });

  assert.equal(shouldAutoRefreshMobileAccess({
    active: true,
    item: null,
    loading: false,
    refreshTimer: 0,
    autoRefreshQueued: false,
    error: "still failing",
    attemptedAfterError: true
  }), false);
});

test("mobile access settings promotes the first successful refresh to a full settings render", () => {
  assert.equal(shouldPromoteMobileAccessRefreshRender({
    active: true,
    hadItemBeforeRefresh: false,
    item: { accessUrl: "http://192.168.65.60:5173/mobile" }
  }), true);

  assert.equal(shouldPromoteMobileAccessRefreshRender({
    active: true,
    hadItemBeforeRefresh: true,
    item: { accessUrl: "http://192.168.65.60:5173/mobile" }
  }), false);

  assert.equal(shouldPromoteMobileAccessRefreshRender({
    active: false,
    hadItemBeforeRefresh: false,
    item: { accessUrl: "http://192.168.65.60:5173/mobile" }
  }), false);
});
