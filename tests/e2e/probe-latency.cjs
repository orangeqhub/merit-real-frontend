/* eslint-disable */
const http = require("http");
function getWithHeaders(headers) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const r = http.request(
      {
        host: "localhost",
        port: 3001,
        path: "/api/map/plots?layout=anne-enclave&page=1&pageSize=50",
        method: "GET",
        headers,
      },
      (res) => {
        let n = 0;
        res.on("data", (c) => (n += c.length));
        res.on("end", () => resolve({ ms: Date.now() - t0, status: res.statusCode, len: n }));
      }
    );
    r.on("error", (e) => resolve({ ms: Date.now() - t0, err: e.message }));
    r.end();
  });
}
(async () => {
  console.log("no origin        =>", JSON.stringify(await getWithHeaders({ Accept: "application/json" })));
  console.log("browser-like     =>", JSON.stringify(await getWithHeaders({
    Accept: "application/json",
    "Origin": "http://localhost:5174",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
  })));
  console.log("with cache params =>", JSON.stringify(await getWithHeaders({
    Accept: "application/json",
    "Origin": "http://localhost:5174",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  })));
})();