import { DocumentItem, AppUserRole, DedicatedLinkItem } from '../types';

/**
 * Unified data-mapping utility for Google Sheets synchronization.
 * Ensures internal state structures are properly formatted for 
 * 'Master Tracking', 'Personnel Directory', and 'Dedicated Links'.
 */

export const SheetMappers = {
  
  // 1. Master Tracking (Documents)
  toSheetDocument(doc: DocumentItem): Record<string, any> {
    return {
      id: doc.id,
      trackingNumber: doc.trackingNumber,
      title: doc.title || '',
      priority: doc.priority || 'Routine',
      communicationType: doc.communicationType || 'Internal',
      documentType: doc.documentType || 'Other',
      reportType: doc.reportType || 'N/A',
      originDepartment: doc.originDepartment || '',
      dateReceived: doc.dateReceived || '',
      timeReceived: doc.timeReceived || '',
      responsiblePerson: doc.responsiblePerson || '',
      currentCustodian: doc.currentCustodian || '',
      targetDivision: doc.targetDivision || '',
      currentStatus: doc.currentStatus || 'Incoming Logged',
      currentLocation: doc.currentLocation || '',
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: doc.updatedAt || new Date().toISOString(),
      fileLink: doc.fileLink || '',
      
      // Complex objects are stored as JSON strings in the sheet
      supervisorRemarks: doc.supervisorRemarks ? JSON.stringify(doc.supervisorRemarks) : '[]',
      movements: doc.movements ? JSON.stringify(doc.movements) : '[]',
      managerClearance: doc.managerClearance ? JSON.stringify(doc.managerClearance) : 'null',
    };
  },

  fromSheetDocument(row: any): DocumentItem {
    return {
      id: row.id,
      trackingNumber: row.trackingNumber,
      title: row.title || '',
      priority: row.priority || 'Routine',
      communicationType: row.communicationType || 'Internal',
      documentType: row.documentType || 'Other',
      reportType: row.reportType || 'N/A',
      originDepartment: row.originDepartment || '',
      dateReceived: row.dateReceived || '',
      timeReceived: row.timeReceived || '',
      responsiblePerson: row.responsiblePerson || '',
      currentCustodian: row.currentCustodian || '',
      targetDivision: row.targetDivision || '',
      currentStatus: row.currentStatus || 'Incoming Logged',
      currentLocation: row.currentLocation || '',
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
      fileLink: row.fileLink || '',
      
      supervisorRemarks: typeof row.supervisorRemarks === 'string' ? JSON.parse(row.supervisorRemarks || '[]') : (row.supervisorRemarks || []),
      movements: typeof row.movements === 'string' ? JSON.parse(row.movements || '[]') : (row.movements || []),
      managerClearance: typeof row.managerClearance === 'string' ? JSON.parse(row.managerClearance || 'null') : (row.managerClearance || null),
    };
  },

  // 2. Personnel Directory
  toSheetPersonnel(staff: AppUserRole): Record<string, any> {
    return {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      division: staff.division || '',
      email: staff.email || '',
      username: staff.username || '',
    };
  },

  fromSheetPersonnel(row: any): AppUserRole {
    return {
      id: row.id,
      name: row.name,
      role: row.role as any,
      division: row.division || '',
      email: row.email || '',
      username: row.username || '',
    };
  },

  // 3. Dedicated Links
  toSheetLink(link: DedicatedLinkItem): Record<string, any> {
    return {
      id: link.id,
      title: link.title,
      url: link.url,
      category: link.category,
      description: link.description || '',
      targetDivision: link.targetDivision || '',
      iconType: link.iconType || 'link',
      addedBy: link.addedBy || '',
      addedAt: link.addedAt || '',
      isPinned: Boolean(link.isPinned),
    };
  },

  fromSheetLink(row: any): DedicatedLinkItem {
    return {
      id: row.id,
      title: row.title,
      url: row.url,
      category: row.category,
      description: row.description || '',
      targetDivision: row.targetDivision || '',
      iconType: row.iconType as any || 'link',
      addedBy: row.addedBy || '',
      addedAt: row.addedAt || '',
      isPinned: Boolean(row.isPinned),
    };
  }
};
