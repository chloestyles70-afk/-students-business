import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "dist");
const parsedPort = Number.parseInt(process.env.PORT || "8080", 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 8080;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function resolveSafePath(requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null;
  }

  const normalized = path.posix.normalize(decoded);
  const relative = normalized.replace(/^\/+/, "");
  if (relative.split("/").includes("..")) return null;

  const filePath = path.resolve(root, relative);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) return null;
  return filePath;
}

const server = createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, {
      "Content-Type": "text/plain; charset=utf-8",
      Allow: "GET, HEAD"
    });
    res.end("Method not allowed");
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/health") {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(req.method === "HEAD" ? undefined : "ok");
    return;
  }

  const filePath = resolveSafePath(url.pathname);
  if (!filePath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  let target = filePath;
  let data;

  try {
    data = await readFile(target);
  } catch {
    if (path.extname(url.pathname)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    target = path.join(root, "index.html");
    try {
      data = await readFile(target);
    } catch (error) {
      console.error("Failed to read application shell:", error);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Internal server error");
      return;
    }
  }

  const extension = path.extname(target).toLowerCase();
  const headers = {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Cache-Control":
      extension === ".html"
        ? "no-cache"
        : "public, max-age=31536000, immutable"
  };

  res.writeHead(200, headers);
  res.end(req.method === "HEAD" ? undefined : data);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`CampusHub static server listening on ${port}`);
});
