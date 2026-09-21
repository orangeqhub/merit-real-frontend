/* eslint-disable */
const http = require("http");
function get(path) {
  return new Promise((resolve) => {
    const r = http.request(
      { host: "localhost", port: 3001, path, method: "GET", headers: { Accept: "application/json" } },
      (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => resolve({ status: res.statusCode, body: b }));
      }
    );
    r.on("error", (e) => resolve({ status: 0, body: e.message }));
    r.end();
  });
}
(async () => {
  const res = await get(
    "/api/map/plots?layout=anne-enclave&page=1&pageSize=500"
  );
  const json = JSON.parse(res.body);
  const items = (json.data && json.data.items) || [];
  const want = ["76", "35", "8"];
  for (const pno of want) {
    const row = items.find((x) => String(x.plotNo) === pno);
    console.log(
      `anne plotNo=${pno} -> externalId=${row ? row.externalId : "!!MISSING"} id=${row ? row.id : "-"} status=${row ? row.status : "-"} area=${row ? row.plotArea : "-"}`
    );
  }
})();