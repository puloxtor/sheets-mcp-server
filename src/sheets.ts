import { google, sheets_v4 } from 'googleapis';
import { getGoogleAuth } from './auth';

export class GoogleSheetsClient {
  private sheets: sheets_v4.Sheets | null = null;
  private auth: any;

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth() {
    try {
      this.auth = getGoogleAuth();
      if (!this.auth) {
        return;
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('Google Sheets Client Initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Google Sheets Auth:', error);
    }
  }

  private getSheetsClient(): sheets_v4.Sheets {
    if (!this.sheets) {
      throw new Error('Sheets client is not initialized. Check your credentials.');
    }
    return this.sheets;
  }

  async createSpreadsheet(title: string): Promise<string> {
    const sheets = this.getSheetsClient();
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
      },
    });
    return response.data.spreadsheetId || '';
  }

  async readSheet(spreadsheetId: string, range: string): Promise<any[][]> {
    const sheets = this.getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data.values || [];
  }

  async writeSheet(spreadsheetId: string, range: string, values: any[][]): Promise<number> {
    const sheets = this.getSheetsClient();
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
    return response.data.updatedCells || 0;
  }

  async appendSheet(spreadsheetId: string, range: string, values: any[][]): Promise<number> {
    const sheets = this.getSheetsClient();
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
    return response.data.updates?.updatedCells || 0;
  }
}
