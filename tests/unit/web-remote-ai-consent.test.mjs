import test from "node:test";
import assert from "node:assert/strict";
import { setRemoteAiConfigurationConsent, remoteAiConfigurationConsented } from "../../apps/web/src/remote-ai-consent.js";

test("remote configuration consent is explicit and bound to service and model", () => {
  const ai = { providerEndpointUrl: "https://example.test/v1", remoteRuntimeModel: "model", secretRef: "ref" };
  const provider = "openai_compatible_gateway";
  assert.equal(remoteAiConfigurationConsented(ai, provider), false);
  setRemoteAiConfigurationConsent(ai, provider, true);
  assert.equal(remoteAiConfigurationConsented(ai, provider), true);
  for (const [field, value] of [["providerEndpointUrl", "https://other.test/v1"], ["remoteRuntimeModel", "other-model"], ["secretRef", "other-ref"]]) {
    assert.equal(remoteAiConfigurationConsented({ ...ai, [field]: value }, provider), false);
  }
  assert.equal(remoteAiConfigurationConsented(ai, "different-provider"), false);
  setRemoteAiConfigurationConsent(ai, provider, false);
  assert.equal(remoteAiConfigurationConsented(ai, provider), false);
});
