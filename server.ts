import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Ensure data directory exists for persistent multi-device state
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const SHEET_CONFIG_FILE = path.join(DATA_DIR, "sheet-config.json");
const DOCUMENTS_FILE = path.join(DATA_DIR, "documents.json");
const STAFF_FILE = path.join(DATA_DIR, "staff.json");
const LINKS_FILE = path.join(DATA_DIR, "links.json");

// In-memory caches for low latency
let cachedSheetConfig: any = null;
let sharedGoogleToken: { token: string; expiresAt: number } | null = null;

const DEFAULT_INITIAL_LINKS = [
  {
    id: "link-drive-master",
    title: "POSSD Master Google Drive Repository",
    url: "https://drive.google.com",
    category: "Google Drive",
    description: "Central cloud drive repository for division folders, digital copies, and clearance attachments.",
    targetDivision: "All Divisions",
    iconType: "drive",
    addedBy: "System Admin",
    addedAt: new Date().toISOString(),
    isPinned: true,
  },
  {
    id: "link-routing-template",
    title: "Standard Internal Routing Slip Template",
    url: "https://docs.google.com/spreadsheets",
    category: "Official Files",
    description: "Prescribed routing slip sheet for tracking multi-desk document transmittals and compliance.",
    targetDivision: "All Divisions",
    iconType: "sheet",
    addedBy: "System Admin",
    addedAt: new Date().toISOString(),
    isPinned: true,
  },
  {
    id: "link-philpost-portal",
    title: "Philippine Postal Corporation Portal",
    url: "https://www.phlpost.gov.ph",
    category: "Portals & Systems",
    description: "Official PHLPost institutional corporate portal and administrative circulars directory.",
    targetDivision: "Administrative Section",
    iconType: "link",
    addedBy: "System Admin",
    addedAt: new Date().toISOString(),
    isPinned: false,
  },
  {
    id: "link-sla-manual",
    title: "Document Turnaround & SLA Threshold Handbook",
    url: "https://drive.google.com",
    category: "Reference Guidelines",
    description: "Operating reference guide on time-in-desk limits, urgent transactions, and focal routing.",
    targetDivision: "All Divisions",
    iconType: "file",
    addedBy: "System Admin",
    addedAt: new Date().toISOString(),
    isPinned: false,
  },
];

// Initialize links file if not present
try {
  if (!fs.existsSync(LINKS_FILE)) {
    fs.writeFileSync(LINKS_FILE, JSON.stringify(DEFAULT_INITIAL_LINKS, null, 2), "utf-8");
  }
} catch (e) {
  console.warn("Could not seed links.json:", e);
}

// Initialize caches from disk
try {
  if (fs.existsSync(SHEET_CONFIG_FILE)) {
    cachedSheetConfig = JSON.parse(fs.readFileSync(SHEET_CONFIG_FILE, "utf-8"));
  }
} catch (e) {
  console.warn("Could not read sheet-config.json:", e);
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 1. Google Sheet Cross-Device Configuration
app.get("/api/sheet-config", (_req, res) => {
  try {
    if (!cachedSheetConfig && fs.existsSync(SHEET_CONFIG_FILE)) {
      cachedSheetConfig = JSON.parse(fs.readFileSync(SHEET_CONFIG_FILE, "utf-8"));
    }
    res.json({
      success: true,
      sheetConfig: cachedSheetConfig,
      hasSharedToken: Boolean(sharedGoogleToken && sharedGoogleToken.expiresAt > Date.now()),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/sheet-config", (req, res) => {
  try {
    const sheetConfig = req.body.sheetConfig !== undefined ? req.body.sheetConfig : req.body;
    cachedSheetConfig = sheetConfig && Object.keys(sheetConfig).length > 0 ? sheetConfig : null;
    if (cachedSheetConfig) {
      fs.writeFileSync(SHEET_CONFIG_FILE, JSON.stringify(cachedSheetConfig, null, 2), "utf-8");
    } else if (fs.existsSync(SHEET_CONFIG_FILE)) {
      fs.unlinkSync(SHEET_CONFIG_FILE);
    }
    res.json({ success: true, sheetConfig: cachedSheetConfig });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Shared Google Auth Token (Allows 1 device sign-in to empower all devices)
app.get("/api/sheet-auth-token", (_req, res) => {
  if (sharedGoogleToken && sharedGoogleToken.expiresAt > Date.now()) {
    res.json({ success: true, token: sharedGoogleToken.token, expiresAt: sharedGoogleToken.expiresAt });
  } else {
    res.json({ success: true, token: null });
  }
});

app.post("/api/sheet-auth-token", (req, res) => {
  try {
    const { token, expiresInSeconds } = req.body;
    if (token) {
      const ttlMs = (expiresInSeconds || 3300) * 1000;
      sharedGoogleToken = {
        token,
        expiresAt: Date.now() + ttlMs,
      };
    } else {
      sharedGoogleToken = null;
    }
    res.json({ success: true, active: Boolean(sharedGoogleToken) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Central Document Registry (Cross-Device Shared Documents)
app.get("/api/documents", (_req, res) => {
  try {
    if (fs.existsSync(DOCUMENTS_FILE)) {
      const docs = JSON.parse(fs.readFileSync(DOCUMENTS_FILE, "utf-8"));
      return res.json({ success: true, documents: docs });
    }
    res.json({ success: true, documents: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/documents", (req, res) => {
  try {
    const docs = Array.isArray(req.body) ? req.body : req.body.documents;
    if (Array.isArray(docs)) {
      fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(docs, null, 2), "utf-8");
    }
    res.json({ success: true, count: docs?.length || 0 });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Central Staff & Roles Directory (Cross-Device Shared Staff)
app.get("/api/staff", (_req, res) => {
  try {
    if (fs.existsSync(STAFF_FILE)) {
      const staff = JSON.parse(fs.readFileSync(STAFF_FILE, "utf-8"));
      return res.json({ success: true, staff });
    }
    res.json({ success: true, staff: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/staff", (req, res) => {
  try {
    const staffList = Array.isArray(req.body) ? req.body : req.body.staff;
    if (Array.isArray(staffList)) {
      fs.writeFileSync(STAFF_FILE, JSON.stringify(staffList, null, 2), "utf-8");
    }
    res.json({ success: true, count: staffList?.length || 0 });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Zero-Login Public Google Sheet Data Fetcher (GViz proxy without auth)
app.get("/api/public-sheet", async (req, res) => {
  try {
    const { spreadsheetId, sheet } = req.query;
    if (!spreadsheetId) {
      return res.status(400).json({ error: "Missing spreadsheetId parameter" });
    }

    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json${
      sheet ? `&sheet=${encodeURIComponent(String(sheet))}` : ""
    }`;

    const fetchRes = await fetch(gvizUrl);
    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({
        error: `Failed to fetch public sheet: ${fetchRes.statusText}`,
      });
    }

    const text = await fetchRes.text();
    // Parse Google visualization JSON wrapper
    const jsonStr = text.replace(/^[^{]*/, "").replace(/[^}]*$/, "");
    const parsed = JSON.parse(jsonStr);
    // Send parsed GViz payload directly so clients can read table.rows
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Dedicated Institutional Links (Google Drives, Files, Portals)
app.get("/api/links", (_req, res) => {
  try {
    if (fs.existsSync(LINKS_FILE)) {
      const links = JSON.parse(fs.readFileSync(LINKS_FILE, "utf-8"));
      return res.json({ success: true, links });
    }
    res.json({ success: true, links: DEFAULT_INITIAL_LINKS });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, links: DEFAULT_INITIAL_LINKS });
  }
});

app.post("/api/links", (req, res) => {
  try {
    const links = Array.isArray(req.body) ? req.body : req.body.links;
    if (Array.isArray(links)) {
      fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2), "utf-8");
      return res.json({ success: true, count: links.length });
    }
    res.status(400).json({ success: false, error: "Invalid links payload" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Zero-Login Google Apps Script Webhook Relay (Direct write from any device)
app.post("/api/apps-script-sync", async (req, res) => {
  try {
    const { appsScriptUrl, payload } = req.body;
    if (!appsScriptUrl) {
      return res.status(400).json({ error: "Missing appsScriptUrl parameter" });
    }

    const scriptRes = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await scriptRes.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { text: responseText };
    }

    res.json({ success: scriptRes.ok, data: responseData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// VITE SPA / STATIC SERVING
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
    console.log(`POSSD Tracker full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
