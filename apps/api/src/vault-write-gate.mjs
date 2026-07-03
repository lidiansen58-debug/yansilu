export function createVaultWriteGate() {
  let paused = false;
  let activeWrites = 0;
  const waiters = new Set();

  function notifyWaiters() {
    if (activeWrites !== 0) return;
    for (const resolve of waiters) resolve();
    waiters.clear();
  }

  async function enter({ bypass = false } = {}) {
    if (bypass) return () => {};
    if (paused) {
      const error = new Error("Vault write operations are paused while an encrypted backup is being created.");
      error.code = "VAULT_WRITES_PAUSED";
      error.status = 423;
      throw error;
    }
    activeWrites += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      activeWrites = Math.max(0, activeWrites - 1);
      notifyWaiters();
    };
  }

  async function pauseAndDrain({ timeoutMs = 15000 } = {}) {
    paused = true;
    if (activeWrites === 0) return { activeWrites };

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiters.delete(done);
        const error = new Error("Backup is still waiting for current write operations to finish.");
        error.code = "VAULT_BACKUP_WRITES_BUSY";
        error.status = 423;
        error.details = { activeWrites };
        reject(error);
      }, timeoutMs);
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      waiters.add(done);
    });
    return { activeWrites: 0 };
  }

  function resume() {
    paused = false;
  }

  function status() {
    return { paused, activeWrites };
  }

  return { enter, pauseAndDrain, resume, status };
}

export function createVaultBackupJobGate() {
  let running = false;

  function enter() {
    if (running) {
      const error = new Error("Another encrypted backup or restore task is already running.");
      error.code = "VAULT_BACKUP_ALREADY_RUNNING";
      error.status = 423;
      throw error;
    }
    running = true;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      running = false;
    };
  }

  function status() {
    return { running };
  }

  return { enter, status };
}
