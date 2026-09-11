import { getAccessToken } from "./firebase";
import { DocumentItem, AppUserRole } from "../types";
import { SheetMappers } from "./sheetMapping";

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");
  
  const headers = {
    ...options.headers,
    "Authorization": `Bearer ${token}`
  };
  
  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "API request failed");
  }
  return data.data;
}

export async function fetchDocuments(): Promise<DocumentItem[]> {
  const docs = await fetchWithAuth("/api/documents");
  return docs.map((d: any) => SheetMappers.fromSheetDocument(d));
}

export async function createDocument(doc: DocumentItem): Promise<DocumentItem> {
  const res = await fetchWithAuth("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", payload: SheetMappers.toSheetDocument(doc) })
  });
  return SheetMappers.fromSheetDocument(res);
}

export async function updateDocument(doc: DocumentItem): Promise<DocumentItem> {
  const res = await fetchWithAuth("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", payload: SheetMappers.toSheetDocument(doc) })
  });
  return SheetMappers.fromSheetDocument(res);
}

export async function deleteDocument(docId: string): Promise<void> {
  await fetchWithAuth("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", payload: { id: docId } })
  });
}

export async function fetchStaff(): Promise<AppUserRole[]> {
  const staff = await fetchWithAuth("/api/staff");
  return staff.map((s: any) => SheetMappers.fromSheetPersonnel(s));
}

export async function saveStaffMember(staff: AppUserRole): Promise<void> {
  // In the real app, we save the whole list because Apps Script clears and rewrites it.
  // This function might need to receive an array.
  await fetchWithAuth("/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "saveStaff", payload: [SheetMappers.toSheetPersonnel(staff)] })
  });
}

export async function logAudit(action: string, docId: string, user: string, previousValue: string, newValue: string) {
  await fetchWithAuth("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      action,
      documentId: docId,
      user,
      previousValue,
      newValue
    })
  }).catch(e => console.error("Audit log failed:", e));
}

export async function fetchLinks(): Promise<any[]> {
  return fetchWithAuth("/api/links");
}

export async function saveLinks(links: any[]): Promise<void> {
  await fetchWithAuth("/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(links)
  });
}
