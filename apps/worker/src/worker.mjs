const intervalMs = Number(process.env.WORKER_INTERVAL_MS || 15000);

console.log(`Worker started (interval=${intervalMs}ms)`);

setInterval(() => {
  const now = new Date().toISOString();
  console.log(`[${now}] heartbeat: import/embedding/graph tasks are idle (mvp scaffold)`);
}, intervalMs);
