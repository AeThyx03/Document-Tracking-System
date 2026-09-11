const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

// Add import for SheetMappers
code = code.replace(
  'import { DocumentItem, AppUserRole } from "../types";',
  'import { DocumentItem, AppUserRole } from "../types";\nimport { SheetMappers } from "./sheetMapping";'
);

// update fetchDocuments
code = code.replace(
  'export async function fetchDocuments(): Promise<DocumentItem[]> {\n  return fetchWithAuth("/api/documents");\n}',
  'export async function fetchDocuments(): Promise<DocumentItem[]> {\n  const docs = await fetchWithAuth("/api/documents");\n  return docs.map((d: any) => SheetMappers.fromSheetDocument(d));\n}'
);

// update createDocument
code = code.replace(
  'export async function createDocument(doc: DocumentItem): Promise<DocumentItem> {\n  return fetchWithAuth("/api/documents", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ action: "create", payload: doc })\n  });\n}',
  'export async function createDocument(doc: DocumentItem): Promise<DocumentItem> {\n  const res = await fetchWithAuth("/api/documents", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ action: "create", payload: SheetMappers.toSheetDocument(doc) })\n  });\n  return SheetMappers.fromSheetDocument(res);\n}'
);

// update updateDocument
code = code.replace(
  'export async function updateDocument(doc: DocumentItem): Promise<DocumentItem> {\n  return fetchWithAuth("/api/documents", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ action: "update", payload: doc })\n  });\n}',
  'export async function updateDocument(doc: DocumentItem): Promise<DocumentItem> {\n  const res = await fetchWithAuth("/api/documents", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ action: "update", payload: SheetMappers.toSheetDocument(doc) })\n  });\n  return SheetMappers.fromSheetDocument(res);\n}'
);

// update fetchStaff
code = code.replace(
  'export async function fetchStaff(): Promise<AppUserRole[]> {\n  return fetchWithAuth("/api/staff");\n}',
  'export async function fetchStaff(): Promise<AppUserRole[]> {\n  const staff = await fetchWithAuth("/api/staff");\n  return staff.map((s: any) => SheetMappers.fromSheetPersonnel(s));\n}'
);

// update saveStaffMember
code = code.replace(
  'export async function saveStaffMember(staff: AppUserRole): Promise<void> {\n  await fetchWithAuth("/api/staff", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ action: "update", payload: staff })\n  });\n}',
  'export async function saveStaffMember(staff: AppUserRole): Promise<void> {\n  // In the real app, we save the whole list because Apps Script clears and rewrites it.\n  // This function might need to receive an array.\n  await fetchWithAuth("/api/staff", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ action: "saveStaff", payload: [SheetMappers.toSheetPersonnel(staff)] })\n  });\n}'
);

fs.writeFileSync('src/lib/api.ts', code, 'utf8');
