import { google } from "googleapis";
import credentials from "../../service-account.json"; // path to your JSON key file

export async function getSheetData(
  sheetId: string, 
  range: string
): Promise<any[]> {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  return response.data.values || [];
}
