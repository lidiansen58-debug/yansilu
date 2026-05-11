import { createMockProviderAdapter } from "./mock-provider-adapter.mjs";
import { createOpenAiCompatibleProviderAdapter } from "./openai-compatible-adapter.mjs";
import { normalizeProviderDescriptor } from "./provider-adapter.mjs";
import { resolveProviderDescriptor } from "./provider-presets.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

function adapterProviderId(adapter = {}) {
  return cleanText(adapter.descriptor?.providerId || adapter.providerId || adapter.provider_id);
}

function normalizeAdapterEntry(adapter, source = "registered") {
  const providerId = adapterProviderId(adapter);
  if (!providerId) {
    const error = new Error("provider adapter descriptor.providerId is required");
    error.code = "AI_PROVIDER_ADAPTER_ID_REQUIRED";
    throw error;
  }
  return { providerId, adapter, source };
}

function shouldUseOpenAiCompatibleAdapter(descriptor = {}, options = {}) {
  if (options.useOpenAiCompatibleAdapter === true || options.use_openai_compatible_adapter === true) return true;
  if (options.useMockProviderAdapters === true || options.use_mock_provider_adapters === true) return false;
  return false;
}

function createAdapterForDescriptor(descriptorInput = {}, options = {}) {
  const descriptor = normalizeProviderDescriptor(descriptorInput);
  if (typeof options.providerAdapterFactory === "function") {
    return options.providerAdapterFactory({ descriptor, options });
  }
  if (shouldUseOpenAiCompatibleAdapter(descriptor, options)) {
    return createOpenAiCompatibleProviderAdapter({
      ...options,
      descriptor,
      createExecutor: options.createExecutor === true || options.create_executor === true || options.networkEnabled === true || options.network_enabled === true
    });
  }
  return createMockProviderAdapter({ descriptor });
}

export function createProviderAdapterRegistry(options = {}) {
  const adapters = new Map();
  const adapterOptions = options.adapterOptions || options.adapter_options || {};

  function registerAdapter(adapter, source = "registered") {
    const entry = normalizeAdapterEntry(adapter, source);
    adapters.set(entry.providerId, entry);
    return entry;
  }

  if (options.providerAdapter) {
    registerAdapter(options.providerAdapter, "explicit");
  }
  for (const adapter of Array.isArray(options.providerAdapters || options.provider_adapters) ? options.providerAdapters || options.provider_adapters : []) {
    registerAdapter(adapter);
  }

  return {
    registerAdapter,
    getAdapter(input = {}) {
      const descriptor = resolveProviderDescriptor(input);
      const providerId = descriptor.providerId;
      const existing = adapters.get(providerId);
      if (existing) return { ...existing, descriptor };

      const adapter = createAdapterForDescriptor(descriptor, { ...options, ...adapterOptions, ...input });
      const entry = registerAdapter(adapter, "factory");
      return { ...entry, descriptor };
    },
    listAdapters() {
      return [...adapters.values()].map((entry) => ({
        providerId: entry.providerId,
        source: entry.source,
        descriptor: entry.adapter.descriptor
      }));
    }
  };
}
