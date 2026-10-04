export function createLiveCheckRecorder(report, { secret = "", log = console.log } = {}) {
  const redact = value => secret ? String(value).replaceAll(secret, "[redacted]") : String(value);
  return async function record(name, operation, { required = false } = {}) {
    const start = performance.now();
    let result;
    try {
      const details = await operation();
      result = { ...details, name, ok: true, elapsedMs: Math.round(performance.now() - start) };
    } catch (error) {
      result = { name, ok: false, elapsedMs: Math.round(performance.now() - start), error: redact(error?.message || error) };
    }
    // Sanitize both successes and failures before recording or printing.
    result = JSON.parse(redact(JSON.stringify(result)));
    report.results.push(result);
    log(JSON.stringify(result));
    if (required && !result.ok) throw new Error(`Required live check failed: ${name}`);
    return result;
  };
}
