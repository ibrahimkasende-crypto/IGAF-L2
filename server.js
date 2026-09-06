import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { nodeToWebRequest, sendWebResponse } from "vinext/server/prod-server";

const port = Number(process.env.PORT || 3000);
const host = "0.0.0.0";
const clientDir = path.resolve("dist/client");
const rscEntry = path.resolve("dist/server/index.js");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

let rscHandler = null;

async function serveStatic(req, res) {
  const pathname = decodeURIComponent((req.url ?? "/").split("?")[0] || "/");
  if (pathname === "/" || pathname.includes("\0")) return false;
  const relative = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(clientDir, relative);
  if (!filePath.startsWith(clientDir)) return false;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;
    res.writeHead(200, {
      "content-type": mimeTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    });
    createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  try {
    if (await serveStatic(req, res)) return;
    if (!rscHandler) {
      res.writeHead(503, { "content-type": "text/plain; charset=utf-8", "retry-after": "1" });
      res.end("Démarrage d’IGAF L2…");
      return;
    }
    const url = req.url ?? "/";
    const pathname = url.split("?")[0] || "/";
    const query = url.includes("?") ? url.slice(url.indexOf("?")) : "";
    const response = await rscHandler(nodeToWebRequest(req, pathname + query));
    await sendWebResponse(response, req, res, true);
  } catch (error) {
    console.error("[igaf] Erreur serveur :", error);
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end("Erreur serveur IGAF L2");
    }
  }
});

server.listen(port, host, () => {
  console.log(`[igaf] IGAF L2 écoute sur ${host}:${port}`);
});

try {
  const module = await import(`${pathToFileURL(rscEntry).href}?t=${Date.now()}`);
  const entry = module.default;
  if (typeof entry === "function") {
    rscHandler = (request) => Promise.resolve(entry(request));
  } else if (entry && typeof entry.fetch === "function") {
    rscHandler = (request) =>
      Promise.resolve(
        entry.fetch(request, undefined, {
          waitUntil(promise) {
            Promise.resolve(promise).catch(() => {});
          },
          passThroughOnException() {},
        }),
      );
  } else {
    throw new Error("Le module dist/server/index.js n’exporte pas de gestionnaire.");
  }
  console.log("[igaf] Gestionnaire Vinext prêt.");
} catch (error) {
  console.error("[igaf] Impossible de charger Vinext :", error);
}
