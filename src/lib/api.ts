import { DocumentItem, AppUserRole } from "../types";

export async function fetchDocuments(): Promise<DocumentItem[]> {
  return []; // Rely on local storage & Google Sheets sync
}

export async function createDocument(doc: DocumentItem): Promise<DocumentItem> {
  return doc;
}

export async function updateDocument(doc: DocumentItem): Promise<DocumentItem> {
  return doc;
}

export async function deleteDocument(docId: string): Promise<void> {
  return;
}

export async function fetchStaff(): Promise<AppUserRole[]> {
  return []; // Rely on local storage & Google Sheets sync
}

export async function saveStaffMember(staff: AppUserRole): Promise<void> {
  return;
}

export async function logAudit(action: string, docId: string, user: string, previousValue: string, newValue: string) {
  return;
}

export async function fetchLinks(): Promise<any[]> {
  return [];
}

export async function saveLinks(links: any[]): Promise<void> {
  return;
}
