/// <reference path="../pb_data/types.d.ts" />

// The single authoritative scheduler for the whole stack. PocketBase is the
// one always-on singleton (SQLite on one volume — it can't fan out), so the
// clock lives here. It owns *when*; the web app owns the actual web-push send
// (the VAPID signing lives in the Node `web-push` lib), so this just pokes the
// web endpoint over Fly's internal network. The web machine auto-starts on the
// incoming request even when it's scaled to zero.
cronAdd("rideReminders", "0 * * * *", () => {
  const url    = $os.getenv("WEB_CRON_URL") ||
    "http://paceline.internal:3000/api/cron/ride-reminders";
  const secret = $os.getenv("CRON_SECRET");

  if (!secret) {
    console.log("[rideReminders] CRON_SECRET not set — skipping");
    return;
  }

  try {
    const res = $http.send({
      url:     url,
      method:  "POST",
      headers: { "x-cron-secret": secret },
      timeout: 120, // seconds — generous; the handler fans out push per ride
    });
    console.log("[rideReminders] tick →", res.statusCode, res.raw);
  } catch (err) {
    console.log("[rideReminders] request failed:", err);
  }
});

// Close route-bucket votes past their deadline and spawn the winning ride.
// Same single-scheduler rationale as above.
cronAdd("closeBuckets", "5 * * * *", () => {
  const base   = $os.getenv("WEB_CRON_URL") ||
    "http://paceline.internal:3000/api/cron/ride-reminders";
  const url    = base.replace("/ride-reminders", "/close-buckets");
  const secret = $os.getenv("CRON_SECRET");

  if (!secret) {
    console.log("[closeBuckets] CRON_SECRET not set — skipping");
    return;
  }

  try {
    const res = $http.send({
      url:     url,
      method:  "POST",
      headers: { "x-cron-secret": secret },
      timeout: 120,
    });
    console.log("[closeBuckets] tick →", res.statusCode, res.raw);
  } catch (err) {
    console.log("[closeBuckets] request failed:", err);
  }
});
