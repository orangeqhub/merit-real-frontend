/* eslint-disable */
const http = require("http");
function apiReq(method, pathname, body, token) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const finalPath = pathname.startsWith("/api") ? pathname : `/api${pathname}`;
    const r = http.request(
      {
        host: "localhost", port: 3001, path: finalPath, method,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => {
          let parsed = null;
          try { parsed = JSON.parse(b); } catch {}
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    r.on("error", (e) => resolve({ status: 0, body: { error: e.message } }));
    if (payload) r.write(payload);
    r.end();
  });
}
(async () => {
  const targets = [
    ["anne-enclave", "76"],
    ["sri-lakshmi", "77"],
    ["dokiparru", "5"],
    ["manjunadha-enclave", "41"],
    ["vinfra", "7"],
    ["mandira-developers", "3"],
    ["mandira-developers", "25"],
  ];
  for (const [layout, plotNo] of targets) {
    const res = await apiReq("GET", `/map/plots/${encodeURIComponent(plotNo)}?layout=${encodeURIComponent(layout)}&plotNo=${encodeURIComponent(plotNo)}`);
    const d = res.body && res.body.data;
    console.log(
      layout,
      "plotNo=" + plotNo,
      "->",
      d
        ? `status=${d.status} customer=${d.customerName || null} rate=${d.ratePerSqYd != null ? Number(d.ratePerSqYd) : null} cost=${d.plotCost != null ? Number(d.plotCost) : null} facing=${d.facing || null} area=${d.plotArea != null ? Number(d.plotArea) : null}`
        : `NO ROW (http ${res.status})`
    );
  }
})();