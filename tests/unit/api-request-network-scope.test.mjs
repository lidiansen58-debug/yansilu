import test from "node:test";
import assert from "node:assert/strict";

import {
  isDirectLanRemoteAddress,
  isLoopbackRemoteAddress,
  isMobileLanPath,
  isPrivateLanRemoteAddress,
  requestMayAccessLan
} from "../../apps/api/src/api-request-network-scope.mjs";

const TEST_INTERFACES = {
  WLAN: [
    { address: "192.168.1.10", cidr: "192.168.1.10/24", family: "IPv4", internal: false },
    { address: "fd12:3456::10", cidr: "fd12:3456::10/64", family: "IPv6", internal: false },
    { address: "fe80::10%12", cidr: "fe80::10%12/64", family: "IPv6", internal: false }
  ],
  Ethernet: [
    { address: "10.20.0.10", cidr: "10.20.0.10/16", family: "IPv4", internal: false }
  ],
  Loopback: [
    { address: "127.0.0.1", cidr: "127.0.0.1/8", family: "IPv4", internal: true }
  ]
};

test("local API routes stay limited to loopback clients", () => {
  for (const address of ["127.0.0.1", "127.0.0.8", "::1", "::ffff:127.0.0.1"]) {
    assert.equal(isLoopbackRemoteAddress(address), true, address);
    assert.equal(requestMayAccessLan({ socket: { remoteAddress: address } }, "/api/v1/vault"), true, address);
  }

  assert.equal(requestMayAccessLan({ socket: { remoteAddress: "192.168.1.20" } }, "/api/v1/vault"), false);
  assert.equal(requestMayAccessLan({ socket: { remoteAddress: "::ffff:192.168.1.20" } }, "/health"), false);
});

test("LAN clients can reach only the mobile surface", () => {
  for (const address of ["10.20.4.2", "192.168.1.20", "::ffff:192.168.1.20", "fd12:3456::8", "fe80::20%12"]) {
    assert.equal(isPrivateLanRemoteAddress(address), true, address);
    assert.equal(isDirectLanRemoteAddress(address, TEST_INTERFACES), true, address);
    for (const pathname of [
      "/mobile",
      "/app/mobile",
      "/mobile.js",
      "/mobile.css",
      "/api/v1/mobile/pair-requests",
      "/api/v1/mobile/quick-notes"
    ]) {
      assert.equal(isMobileLanPath(pathname), true, pathname);
      assert.equal(
        requestMayAccessLan({ socket: { remoteAddress: address } }, pathname, { networkInterfaces: TEST_INTERFACES }),
        true,
        `${address} ${pathname}`
      );
    }
  }

  for (const pathname of ["/", "/api/v1/notes", "/api/v1/vault", "/mobile-other"]) {
    assert.equal(isMobileLanPath(pathname), false, pathname);
  }
});

test("public and untrusted addresses cannot reach the mobile surface", () => {
  for (const address of [
    "10.30.4.2",
    "172.16.4.2",
    "192.168.2.20",
    "fd12:9999::8",
    "8.8.8.8",
    "100.64.0.2",
    "198.51.100.8",
    "2001:4860:4860::8888",
    "not-an-ip",
    ""
  ]) {
    assert.equal(isDirectLanRemoteAddress(address, TEST_INTERFACES), false, address);
    assert.equal(
      requestMayAccessLan({ socket: { remoteAddress: address } }, "/mobile", { networkInterfaces: TEST_INTERFACES }),
      false,
      address
    );
    assert.equal(
      requestMayAccessLan(
        { socket: { remoteAddress: address } },
        "/api/v1/mobile/pair-requests",
        { networkInterfaces: TEST_INTERFACES }
      ),
      false,
      address
    );
  }
});
