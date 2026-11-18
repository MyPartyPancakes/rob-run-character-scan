// Offline R&D utility: probes public endpoints on robrunstatus.com to check
// whether server directory data is exposed as JSON vs client-rendered HTML.
// Not used at runtime (runtime uses lib/servers.js + public/data/servers.snapshot.json).

const probes = [
  "https://robrunstatus.com/api/servers.json",
  "https://robrunstatus.com/api/servers",
  "https://robrunstatus.com/api/directory.json",
  "https://robrunstatus.com/api/wipes.json",
  "https://robrunstatus.com/data/servers.json",
];

for (const url of probes) {
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    const body = await res.text();
    console.log(url, res.status, body.slice(0, 180));
  } catch (error) {
    console.log(url, error.message);
  }
}
