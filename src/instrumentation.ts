export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.DISABLE_SCHEDULER === "1") {
      console.log("[instrumentation] Scheduler DISABLED (DISABLE_SCHEDULER=1) — no inbox sync / auto-replies / auto-sends / follow-ups");
      return;
    }
    const { startFollowUpScheduler } = await import("./lib/scheduler");
    startFollowUpScheduler();
  }
}
