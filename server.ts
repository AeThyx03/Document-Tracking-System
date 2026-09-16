import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth } from "./server/middleware/auth.ts";
import { errorHandler } from "./server/middleware/errorHandler.ts";
import { healthRouter } from "./server/routes/health.ts";
import { authRouter } from "./server/routes/auth.ts";
import { documentsRouter } from "./server/routes/documents.ts";
import { personnelRouter } from "./server/routes/personnel.ts";
import { departmentsRouter } from "./server/routes/departments.ts";
import { linksRouter } from "./server/routes/links.ts";
import { slaRouter } from "./server/routes/sla.ts";
import { desksRouter } from "./server/routes/desks.ts";
import { dashboardRouter } from "./server/routes/dashboard.ts";
import { auditRouter } from "./server/routes/audit.ts";
import { codebaseRouter } from "./server/routes/codebase.ts";
import { dropdownsRouter } from "./server/routes/dropdowns.ts";
import { createAuditLog } from "./server/services/auditService.ts";
import { validateJwtConfiguration } from "./server/config/jwt.ts";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// -------------------------------------------------------------
// 1. HEALTH CHECK ENDPOINT (UNAUTHENTICATED FOR PROBES)
// -------------------------------------------------------------
app.use("/api", healthRouter);

// -------------------------------------------------------------
// 2. POSSD AUTHORITATIVE POSTGRESQL API ROUTES
// -------------------------------------------------------------

// Authentication endpoints
app.use("/api", authRouter);

// Apply strict auth
app.use("/api", requireAuth);

app.use("/api", documentsRouter);
app.use("/api", personnelRouter);
app.use("/api", departmentsRouter);
app.use("/api", linksRouter);
app.use("/api", desksRouter);
app.use("/api", dashboardRouter);
app.use("/api", auditRouter);
app.use("/api", codebaseRouter);
app.use("/api", dropdownsRouter);
app.use("/api", slaRouter);

// Centralized error handler
app.use(errorHandler);

// -------------------------------------------------------------
// 3. VITE SPA / STATIC ASSET SERVING
// -------------------------------------------------------------
async function startServer() {
  // Fail fast immediately if authentication configuration is invalid
  validateJwtConfiguration();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`POSSD Tracker backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
