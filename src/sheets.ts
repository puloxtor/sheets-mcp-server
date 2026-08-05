import { google, sheets_v4 } from 'googleapis';

export class GoogleSheetsClient {
  private sheets: sheets_v4.Sheets | null = null;
  private auth: any;

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth() {
    try {
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!clientEmail || !privateKey) {
        console.warn('Google Credentials are not fully provided in environment variables.');
        return;
      }

      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

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
