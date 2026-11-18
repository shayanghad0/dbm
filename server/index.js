import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import apiRouter from "./routes/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const PORT = Number(process.env.PORT || 4001);
const app = express();

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Lightweight request log (skip health checks to keep the console clean)
app.use((req, res, next) => {
  if (req.path === "/api/health") return next();
  const started = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - started}ms)`);
  });
  next();
});

app.use("/api", apiRouter);

// Serve the built client when it exists (production / `npm start`)
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

// API 404
app.use("/api", (req, res) => {
  res.status(404).json({ error: { message: "API route not found", code: "NOT_FOUND" } });
});

// Central error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: {
      message: err.message || "Internal server error",
      code: err.code || (status >= 500 ? "INTERNAL" : "BAD_REQUEST"),
    },
  });
});

app.listen(PORT, () => {
  console.log(`DB Easy Builder API listening on http://localhost:${PORT}`);
  console.log(`Client: ${existsSync(distDir) ? `http://localhost:${PORT}` : "http://localhost:5173 (vite dev)"}`);
});
