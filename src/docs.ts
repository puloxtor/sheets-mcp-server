import { google, docs_v1 } from 'googleapis';
import { getGoogleAuth } from './auth';

export class GoogleDocsClient {
  private docs: docs_v1.Docs | null = null;
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

      this.docs = google.docs({ version: 'v1', auth: this.auth });
      console.log('Google Docs Client Initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Google Docs Auth:', error);
    }
  }

  private getDocsClient(): docs_v1.Docs {
    if (!this.docs) {
      throw new Error('Docs client is not initialized. Check your credentials.');
    }
    return this.docs;
  }

  async createDocument(title: string): Promise<string> {
    const docs = this.getDocsClient();
    const response = await docs.documents.create({
      requestBody: { title },
    });
    return response.data.documentId || '';
  }

  async readDocument(documentId: string): Promise<string> {
    const docs = this.getDocsClient();
    const response = await docs.documents.get({ documentId });
    return extractText(response.data.body?.content);
  }

  // The body's trailing newline cannot be written past, so the last valid
  // insertion point is one index before the end of the final element.
  private async getAppendIndex(documentId: string): Promise<number> {
    const docs = this.getDocsClient();
    const response = await docs.documents.get({ documentId });
    const content = response.data.body?.content;
    const endIndex = content?.[content.length - 1]?.endIndex ?? 2;
    return Math.max(1, endIndex - 1);
  }

  async appendToDocument(documentId: string, text: string): Promise<number> {
    const docs = this.getDocsClient();
    const index = await this.getAppendIndex(documentId);

    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{ insertText: { location: { index }, text } }],
      },
    });
    return index;
  }

  async insertText(documentId: string, index: number, text: string): Promise<void> {
    const docs = this.getDocsClient();
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{ insertText: { location: { index }, text } }],
      },
    });
  }

  async replaceText(
    documentId: string,
    searchText: string,
    replaceText: string,
    matchCase: boolean
  ): Promise<number> {
    const docs = this.getDocsClient();
    const response = await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            replaceAllText: {
              containsText: { text: searchText, matchCase },
              replaceText,
            },
          },
        ],
      },
    });
    return response.data.replies?.[0]?.replaceAllText?.occurrencesChanged || 0;
  }

  async deleteRange(documentId: string, startIndex: number, endIndex: number): Promise<void> {
    const docs = this.getDocsClient();
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{ deleteContentRange: { range: { startIndex, endIndex } } }],
      },
    });
  }
}

// A document body is a tree of structural elements; text only ever lives on a
// paragraph's text runs, so tables and the ToC have to be walked recursively.
function extractText(elements?: docs_v1.Schema$StructuralElement[]): string {
  if (!elements) {
    return '';
  }

  let text = '';
  for (const element of elements) {
    if (element.paragraph?.elements) {
      for (const paragraphElement of element.paragraph.elements) {
        text += paragraphElement.textRun?.content ?? '';
      }
    } else if (element.table?.tableRows) {
      for (const row of element.table.tableRows) {
        for (const cell of row.tableCells ?? []) {
          text += extractText(cell.content ?? undefined);
        }
      }
    } else if (element.tableOfContents?.content) {
      text += extractText(element.tableOfContents.content);
    }
  }
  return text;
}
