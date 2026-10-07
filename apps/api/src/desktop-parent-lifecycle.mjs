export function bindDesktopParentLifecycle({
  server,
  env = process.env,
  input = process.stdin,
  exit = code => process.exit(code),
  timeoutMs = 1500,
  log = message => console.log(message)
}) {
  if (env.YANSILU_DESKTOP_PARENT_CHANNEL !== "stdin-eof") return;
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    log("Desktop parent channel closed; stopping owned API.");
    let finished = false;
    const finish = code => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      exit(code);
    };
    const timeout = setTimeout(() => finish(1), timeoutMs);
    server.close(() => finish(0));
    server.closeIdleConnections();
  };
  input.once("end", stop);
  input.once("error", stop);
  input.resume();
}
