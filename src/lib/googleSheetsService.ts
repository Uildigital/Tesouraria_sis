import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const getAuth = () => {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  return new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: SCOPES,
  });
};

const sheets = google.sheets('v4');
const spreadsheetId = process.env.GOOGLE_SHEET_ID;

export async function getRows(range: string) {
  const auth = getAuth();
  const response = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range,
  });
  return response.data.values || [];
}

export async function appendRow(range: string, values: any[]) {
  const auth = getAuth();
  await sheets.spreadsheets.values.append({
    auth,
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [values],
    },
  });
}

export async function updateRow(range: string, values: any[]) {
  const auth = getAuth();
  await sheets.spreadsheets.values.update({
    auth,
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [values],
    },
  });
}

export async function deleteRow(sheetName: string, rowIndex: number) {
  const auth = getAuth();
  // We need the sheet ID to delete a row
  const spreadsheet = await sheets.spreadsheets.get({
    auth,
    spreadsheetId,
  });
  const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);
  const sheetId = sheet?.properties?.sheetId;

  if (sheetId === undefined) throw new Error(`Sheet ${sheetName} not found`);

  await sheets.spreadsheets.batchUpdate({
    auth,
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
}

export async function initializeSheets() {
  const auth = getAuth();
  const sheetsToCreate = ['Transactions', 'Categories', 'Departments', 'Users'];
  
  const spreadsheet = await sheets.spreadsheets.get({
    auth,
    spreadsheetId,
  });

  const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

  for (const title of sheetsToCreate) {
    if (!existingSheets.includes(title)) {
      await sheets.spreadsheets.batchUpdate({
        auth,
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title } } }],
        },
      });
      
      // Add headers
      let headers: string[] = [];
      if (title === 'Transactions') headers = ['id', 'date', 'description', 'amount', 'type', 'category_id', 'department_id', 'user_id', 'created_at'];
      if (title === 'Categories') headers = ['id', 'name', 'type', 'parent_id', 'created_at'];
      if (title === 'Departments') headers = ['id', 'name', 'created_at'];
      if (title === 'Users') headers = ['id', 'email', 'password', 'full_name', 'role', 'created_at'];

      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId,
        range: `${title}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] },
      });
    }
  }
}
