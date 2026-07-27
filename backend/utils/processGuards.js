/**
 * Process-level safety net.
 *
 * Without these handlers a single rejected promise — e.g. `pool.connect()`
 * failing while the database is unreachable — terminates the whole Node
 * process. Every in-flight and subsequent request then fails with a gateway
 * 502 until the platform finishes restarting the container.
 *
 * An unhandled rejection here is almost always operational (DB down, network
 * blip), so it is logged and the server keeps serving. An uncaught exception
 * leaves the process in an unknown state, so it is logged and the process
 * exits to let the platform restart it cleanly.
 */

const SHUTDOWN_GRACE_MS = 1000;

function installProcessGuards() {
  process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    console.error('⚠️ Unhandled promise rejection — server kept alive:', err.message);
    console.error(err.stack);
    if (err.code) {
      console.error(`   code: ${err.code}`);
    }
  });

  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught exception — shutting down:', err.message);
    console.error(err.stack);
    // Give the logger and any in-flight responses a moment to flush.
    setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS).unref();
  });
}

module.exports = installProcessGuards;
