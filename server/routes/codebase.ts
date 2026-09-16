import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { sendApiSuccess, sendApiError } from '../middleware/errorHandler.ts';

export const codebaseRouter = Router();

// Allowed file extensions to include in the compiled codebase bundle
const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.css',
  '.html',
  '.md',
  '.sql',
]);

// Directories and files to strictly ignore
const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.next',
  '.vscode',
  'coverage',
  '.cache',
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  '.env',
  '.env.local',
  '.env.production',
  '.DS_Store',
]);

interface CollectedFile {
  relativePath: string;
  content: string;
  size: number;
}

/**
 * Recursively scans directory and collects source code files.
 */
async function collectFiles(dir: string, baseDir: string): Promise<CollectedFile[]> {
  const results: CollectedFile[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        const subFiles = await collectFiles(fullPath, baseDir);
        results.push(...subFiles);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (
        ALLOWED_EXTENSIONS.has(ext) &&
        !IGNORED_FILES.has(entry.name) &&
        !entry.name.startsWith('.env')
      ) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          results.push({
            relativePath,
            content,
            size: Buffer.byteLength(content, 'utf-8'),
          });
        } catch (readErr) {
          console.warn(`[CODEBASE] Skipping unreadable file ${relativePath}:`, readErr);
        }
      }
    }
  }

  return results;
}

/**
 * Formats collected files into a structured, unified codebase string.
 */
function formatCodebase(files: CollectedFile[]): string {
  // Sort files logically: root configs -> server -> types -> lib -> components -> App
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const sections: string[] = [];
  sections.push(`// =============================================================================`);
  sections.push(`// POSSD DOCUMENT TRACKING SYSTEM - COMPILED CODEBASE BUNDLE`);
  sections.push(`// Total Files: ${files.length}`);
  sections.push(`// Timestamp: ${new Date().toISOString()}`);
  sections.push(`// =============================================================================\n`);

  for (const file of files) {
    sections.push(`\n// =============================================================================`);
    sections.push(`// File: ${file.relativePath}`);
    sections.push(`// Size: ${file.size} bytes`);
    sections.push(`// =============================================================================`);
    sections.push(file.content.trim());
  }

  return sections.join('\n');
}

/**
 * Builds the comprehensive prompt for AI checking and review.
 */
export function buildVerificationPrompt(codebaseText: string, fileCount: number): string {
  return `You are a Principal Software Engineer and Security Auditor conducting a comprehensive architectural and code review of the POSSD Document Tracking and Action Management System.

=============================================================================
AUDIT & VERIFICATION INSTRUCTIONS
=============================================================================
Please analyze the compiled codebase below for the following core areas:

1. WORKFLOW STATE MACHINE & TRANSITIONS
   - Verify all 6 canonical document lifecycle stages:
     (Incoming Logged -> Under Review -> Supervisor Comment Needed -> Complied / Ready for Clearance -> Cleared for Out -> Dispatched / Completed).
   - Ensure uncomplied supervisor remarks strictly block Manager Clearance.
   - Verify that recording movements updates currentCustodian and currentLocation synchronously.

2. DATABASE & TRANSACTION INTEGRITY (PostgreSQL / Drizzle ORM)
   - Verify ACID transactions wrap all multi-table mutations (documents, movements, remarks, clearances, audit_logs).
   - Ensure foreign keys and relational schemas handle desk, department, and personnel links correctly.
   - Check that optimistic concurrency versioning prevents race conditions.

3. SLA & MANILA TIMEZONE ACCURACY
   - Verify SLA working hour calculations strictly follow the Asia/Manila (PST) timezone.
   - Ensure working day overrides, weekend rules, and holiday exclusions (including half-day cutoffs) operate accurately.

4. SECURITY, RBAC & AUDITABILITY
   - Verify JWT authentication, bcrypt password hashing, and role-based authorization for all API routes.
   - Check that passwords are never returned in API responses.
   - Verify append-only, tamper-resistant audit logs for all critical actions.

5. PERFORMANCE & UI RESPONSIVENESS
   - Verify server-side pagination, debounced filtering, and stable tie-breaking on document registry queries.
   - Check error boundaries, network reconnection resiliency, and print reporting.

=============================================================================
COMPILED CODEBASE (${fileCount} Files)
=============================================================================
${codebaseText}
`;
}

/**
 * GET /api/codebase
 * Compiles and returns all project files and checking prompt.
 */
codebaseRouter.get('/codebase', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return sendApiError(res, 403, 'FORBIDDEN', 'Codebase export is disabled in production environments for security reasons.');
  }

  try {
    const rootDir = process.cwd();
    const files = await collectFiles(rootDir, rootDir);
    const rawCodebase = formatCodebase(files);
    const fullPrompt = buildVerificationPrompt(rawCodebase, files.length);

    return sendApiSuccess(res, {
      fileCount: files.length,
      totalSize: Buffer.byteLength(rawCodebase, 'utf-8'),
      timestamp: new Date().toISOString(),
      rawCodebase,
      fullPrompt,
      filesSummary: files.map((f) => ({ path: f.relativePath, size: f.size })),
    });
  } catch (err: any) {
    console.error('[CODEBASE ROUTE] Failed to compile codebase:', err);
    return sendApiError(res, 500, 'CODEBASE_COMPILATION_ERROR', err.message);
  }
});
