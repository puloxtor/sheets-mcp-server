import { google } from 'googleapis';

// Sheets and Docs are separate APIs with separate scopes. Both must be granted
// to the service account, otherwise calls to the missing one fail with 403.
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
];

let cachedAuth: any = null;

export function getGoogleAuth(): any {
  if (cachedAuth) {
    return cachedAuth;
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    console.warn('Google Credentials are not fully provided in environment variables.');
    return null;
  }

  cachedAuth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: GOOGLE_SCOPES,
  });

  return cachedAuth;
}
