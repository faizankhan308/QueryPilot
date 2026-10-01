/**
 * app.js
 *
 * Express application — created and configured here, but NOT started.
 * index.js calls app.listen(); tests import this module directly via Supertest.
 *
 * Load order:
 *   1. dotenv/config  — populates process.env from .env
 *   2. env.js         — validates process.env with Zod, exits on error
 *   3. Express setup  — CORS, body parsing, routes, error handlers
 */

import "dotenv/config";
import "./config/env.js"; // Validate env at startup; exits process on failure.

import express from "express";
import cors from "cors";
import databaseRouter from "./routes/database.js";
import generateRouter from "./routes/generate.js";

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
// Mirror the exact origins allowed by the Python FastAPI backend (main.py).

const ALLOWED_ORIGINS = [
  // Local development
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  // Production — Vercel deployment
  "https://querypilot.vercel.app",
  "https://querypilot-git-main-faizankhan308.vercel.app",
  // Allow any *.vercel.app preview deployment for this project
  /^https:\/\/querypilot.*\.vercel\.app$/,
];

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["*"],
    credentials: true,
  })
);

// ─── BODY PARSING ─────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── ROUTERS ──────────────────────────────────────────────────────────────────

app.use("/database", databaseRouter);
app.use("/generate", generateRouter);

// ─── HEALTH ROUTE ─────────────────────────────────────────────────────────────
// Mirrors the Python equivalent:
//   @app.get("/")
//   def health():
//       return { "status": "ok", "service": "QueryPilot" }

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "QueryPilot",
  });
});

// ─── 404 FALLBACK ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ detail: "Not found" });
});

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const detail = err.message || "Internal server error";
  res.status(status).json({ detail });
});

export default app;
