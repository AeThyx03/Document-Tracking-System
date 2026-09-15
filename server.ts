import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { optionalAuth, requireAuth } from "./server/middleware/auth.ts";
import { errorHandler } from "./server/middleware/errorHandler.ts";
import { healthRouter } from "./server/routes/health.ts";
import { documentsRouter } from "./server/routes/documents.ts";
import { personnelRouter } from "./server/routes/personnel.ts";
import { departmentsRouter } from "./server/routes/departments.ts";
import { linksRouter } from "./server/routes/links.ts";
import { slaRouter } from "./server/routes/sla.ts";
import { desksRouter } from "./server/routes/desks.ts";
import { dashboardRouter } from "./server/routes/dashboard.ts";
import { auditRouter } from "./server/routes/audit.ts";
import { createAuditLog } from "./server/services/auditService.ts";

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
// Apply auth (optionalAuth decodes user if token present, allowing seamless frontend interaction)
app.use("/api", optionalAuth);

app.use("/api", documentsRouter);
app.use("/api", personnelRouter);
app.use("/api", departmentsRouter);
app.use("/api", linksRouter);
app.use("/api", desksRouter);
app.use("/api", dashboardRouter);
app.use("/api", auditRouter);
app.use("/api", slaRouter);
app.use("/api/sla", slaRouter);

// POST /api/audit - Saves directly to PostgreSQL audit_logs table
app.post("/api/audit", async (req: any, res) => {
  try {
    const { action, docId, user, previousValue, newValue } = req.body;
    await createAuditLog({
      userId: user || req.user?.uid || null,
      action: action || 'AUDIT_EVENT',
      entityType: 'document',
      entityId: docId || null,
      oldValue: previousValue ? { value: previousValue } : null,
      newValue: newValue ? { value: newValue } : null,
      metadata: { source: 'client_api' }
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'AUDIT_ERROR', message: err.message });
  }
});

// Centralized error handler
app.use(errorHandler);

// -------------------------------------------------------------
// 3. VITE SPA / STATIC ASSET SERVING
// -------------------------------------------------------------
async function startServer() {
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
