// POSSD Document Tracking - Apps Script Backend
// Deploy as Web App -> Execute as: Me -> Access: Anyone

const API_SECRET = 'your_secure_random_string_here'; // Must match .env API_SECRET

function verifySecret(e) {
  const secret = e.parameter.secret;
  if (secret !== API_SECRET) {
    throw new Error('Unauthorized: Invalid secret token.');
  }
}

function doPost(e) {
  try {
    verifySecret(e);
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const payload = postData.payload;
    
    let result = {};
    if (action === 'create' || action === 'update') {
      result = saveDocument(payload);
    } else if (action === 'delete') {
      result = deleteDocument(payload.id);
    } else if (action === 'saveStaff') {
      result = saveStaff(payload);
    } else if (action === 'logAudit') {
      result = logAudit(payload);
    } else if (action === 'saveLinks') {
      result = saveLinks(payload);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    verifySecret(e);
    const action = e.parameter.action;
    let result = null;
    
    if (action === 'getDocuments') {
      result = getTableData('Master Tracking');
    } else if (action === 'getStaff') {
      result = getTableData('Personnel Directory');
    } else if (action === 'getAudit') {
      result = getTableData('Audit Log');
    } else if (action === 'getLinks') {
      result = getTableData('Dedicated Links');
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getTableData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => { 
      try {
        obj[h] = (typeof row[i] === 'string' && row[i].startsWith('{') || row[i].startsWith('[')) ? JSON.parse(row[i]) : row[i];
      } catch(e) {
        obj[h] = row[i];
      }
    });
    return obj;
  });
}

function saveDocument(doc) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000); 
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Master Tracking');
    if (!sheet) throw new Error("Sheet 'Master Tracking' not found.");
    
    if (!doc.id) {
      doc.id = 'DOC-' + new Date().getFullYear() + '-' + Utilities.getUuid().split('-')[0].toUpperCase();
    }
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    
    let rowIndex = -1;
    if (idIndex > -1) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === doc.id) {
          rowIndex = i + 1;
          break;
        }
      }
    }
    
    const rowData = headers.map(h => {
      let val = doc[h];
      if (typeof val === 'object') return JSON.stringify(val);
      return val === undefined ? '' : val;
    });
    
    if (rowIndex > -1) {
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    return doc;
  } finally {
    lock.releaseLock();
  }
}

function deleteDocument(docId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000); 
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Master Tracking');
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    
    if (idIndex > -1) {
      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][idIndex] === docId) {
          sheet.deleteRow(i + 1);
          return { success: true };
        }
      }
    }
    return { success: false, message: "Not found" };
  } finally {
    lock.releaseLock();
  }
}

function saveStaff(staffList) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000); 
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Personnel Directory');
    if (!sheet) return;
    sheet.clear();
    if (!staffList || staffList.length === 0) return;
    
    const headers = Object.keys(staffList[0]);
    sheet.appendRow(headers);
    
    const rows = staffList.map(staff => headers.map(h => {
      let val = staff[h];
      return typeof val === 'object' ? JSON.stringify(val) : val;
    }));
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    return staffList;
  } finally {
    lock.releaseLock();
  }
}

function saveLinks(linksList) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000); 
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dedicated Links');
    if (!sheet) return;
    sheet.clear();
    if (!linksList || linksList.length === 0) return;
    
    const headers = Object.keys(linksList[0]);
    sheet.appendRow(headers);
    
    const rows = linksList.map(link => headers.map(h => {
      let val = link[h];
      return typeof val === 'object' ? JSON.stringify(val) : val;
    }));
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    return linksList;
  } finally {
    lock.releaseLock();
  }
}

function logAudit(audit) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Audit Log');
  if (!sheet) return;
  const headers = sheet.getDataRange().getValues()[0] || ['timestamp', 'action', 'documentId', 'user', 'previousValue', 'newValue'];
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  
  const rowData = headers.map(h => audit[h] || '');
  sheet.appendRow(rowData);
  return audit;
}
