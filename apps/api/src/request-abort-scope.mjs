export function createRequestAbortScope(req, res) {
  const controller = new AbortController();
  const onAbort = () => controller.abort(new Error("Client cancelled the request."));
  const onClose = () => { if (!res.writableEnded) onAbort(); };
  req.on("aborted", onAbort);
  res.on("close", onClose);
  if (req.aborted || res.destroyed) onAbort();
  return {
    signal: controller.signal,
    dispose() {
      req.off("aborted", onAbort);
      res.off("close", onClose);
    }
  };
}
