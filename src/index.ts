import express from 'express';
import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { GoogleSheetsClient } from './sheets';
import { GoogleDocsClient } from './docs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Google API Clients
const sheetsClient = new GoogleSheetsClient();
const docsClient = new GoogleDocsClient();

// Create MCP Server
const server = new Server(
  {
    name: 'google-sheets-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_spreadsheet',
        description: 'Create a new Google Spreadsheet',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the new spreadsheet' },
          },
          required: ['title'],
        },
      },
      {
        name: 'read_sheet',
        description: 'Read values from a specific range in a Google Sheet',
        inputSchema: {
          type: 'object',
          properties: {
            spreadsheetId: { type: 'string', description: 'ID of the spreadsheet' },
            range: { type: 'string', description: 'A1 notation of the range to read (e.g., Sheet1!A1:D10)' },
          },
          required: ['spreadsheetId', 'range'],
        },
      },
      {
        name: 'write_sheet',
        description: 'Write values to a specific range in a Google Sheet, overwriting existing data',
        inputSchema: {
          type: 'object',
          properties: {
            spreadsheetId: { type: 'string', description: 'ID of the spreadsheet' },
            range: { type: 'string', description: 'A1 notation of the range to write to' },
            values: { 
              type: 'array',
              items: { type: 'array', items: { type: 'string' } },
              description: '2D array of values to write'
            },
          },
          required: ['spreadsheetId', 'range', 'values'],
        },
      },
      {
        name: 'append_sheet',
        description: 'Append values to a specific range in a Google Sheet',
        inputSchema: {
          type: 'object',
          properties: {
            spreadsheetId: { type: 'string', description: 'ID of the spreadsheet' },
            range: { type: 'string', description: 'A1 notation of the range to append to' },
            values: { 
              type: 'array',
              items: { type: 'array', items: { type: 'string' } },
              description: '2D array of values to append'
            },
          },
          required: ['spreadsheetId', 'range', 'values'],
        },
      },
      {
        name: 'create_document',
        description: 'Create a new Google Doc',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the new document' },
          },
          required: ['title'],
        },
      },
      {
        name: 'read_document',
        description: 'Read the full text content of a Google Doc',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string', description: 'ID of the document' },
          },
          required: ['documentId'],
        },
      },
      {
        name: 'append_to_document',
        description: 'Append text to the end of a Google Doc',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string', description: 'ID of the document' },
            text: { type: 'string', description: 'Text to append. Include a leading newline to start a new paragraph.' },
          },
          required: ['documentId', 'text'],
        },
      },
      {
        name: 'insert_text_in_document',
        description: 'Insert text at a specific character index in a Google Doc. Index 1 is the start of the body.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string', description: 'ID of the document' },
            index: { type: 'number', description: 'Character index to insert at (1 is the start of the body)' },
            text: { type: 'string', description: 'Text to insert' },
          },
          required: ['documentId', 'index', 'text'],
        },
      },
      {
        name: 'replace_text_in_document',
        description: 'Replace every occurrence of a string in a Google Doc. Use an empty replaceText to delete the matches.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string', description: 'ID of the document' },
            searchText: { type: 'string', description: 'Text to search for' },
            replaceText: { type: 'string', description: 'Text to replace it with. Empty string deletes the matches.' },
            matchCase: { type: 'boolean', description: 'Whether the search is case sensitive. Defaults to false.' },
          },
          required: ['documentId', 'searchText', 'replaceText'],
        },
      },
      {
        name: 'delete_range_in_document',
        description: 'Delete the content between two character indexes in a Google Doc',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string', description: 'ID of the document' },
            startIndex: { type: 'number', description: 'Start of the range to delete, inclusive' },
            endIndex: { type: 'number', description: 'End of the range to delete, exclusive' },
          },
          required: ['documentId', 'startIndex', 'endIndex'],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case 'create_spreadsheet': {
        const title = request.params.arguments?.title as string;
        const id = await sheetsClient.createSpreadsheet(title);
        return {
          content: [{ type: 'text', text: `Created spreadsheet with ID: ${id}` }],
        };
      }
      
      case 'read_sheet': {
        const spreadsheetId = request.params.arguments?.spreadsheetId as string;
        const range = request.params.arguments?.range as string;
        const values = await sheetsClient.readSheet(spreadsheetId, range);
        return {
          content: [{ type: 'text', text: JSON.stringify(values, null, 2) }],
        };
      }

      case 'write_sheet': {
        const spreadsheetId = request.params.arguments?.spreadsheetId as string;
        const range = request.params.arguments?.range as string;
        const values = request.params.arguments?.values as any[][];
        const updated = await sheetsClient.writeSheet(spreadsheetId, range, values);
        return {
          content: [{ type: 'text', text: `Successfully updated ${updated} cells.` }],
        };
      }

      case 'append_sheet': {
        const spreadsheetId = request.params.arguments?.spreadsheetId as string;
        const range = request.params.arguments?.range as string;
        const values = request.params.arguments?.values as any[][];
        const appended = await sheetsClient.appendSheet(spreadsheetId, range, values);
        return {
          content: [{ type: 'text', text: `Successfully appended data resulting in ${appended} updated cells.` }],
        };
      }

      case 'create_document': {
        const title = request.params.arguments?.title as string;
        const id = await docsClient.createDocument(title);
        return {
          content: [{ type: 'text', text: `Created document with ID: ${id}` }],
        };
      }

      case 'read_document': {
        const documentId = request.params.arguments?.documentId as string;
        const text = await docsClient.readDocument(documentId);
        return {
          content: [{ type: 'text', text }],
        };
      }

      case 'append_to_document': {
        const documentId = request.params.arguments?.documentId as string;
        const text = request.params.arguments?.text as string;
        const index = await docsClient.appendToDocument(documentId, text);
        return {
          content: [{ type: 'text', text: `Successfully appended ${text.length} characters at index ${index}.` }],
        };
      }

      case 'insert_text_in_document': {
        const documentId = request.params.arguments?.documentId as string;
        const index = request.params.arguments?.index as number;
        const text = request.params.arguments?.text as string;
        await docsClient.insertText(documentId, index, text);
        return {
          content: [{ type: 'text', text: `Successfully inserted ${text.length} characters at index ${index}.` }],
        };
      }

      case 'replace_text_in_document': {
        const documentId = request.params.arguments?.documentId as string;
        const searchText = request.params.arguments?.searchText as string;
        const replaceText = request.params.arguments?.replaceText as string;
        const matchCase = (request.params.arguments?.matchCase as boolean) ?? false;
        const occurrences = await docsClient.replaceText(documentId, searchText, replaceText, matchCase);
        return {
          content: [{ type: 'text', text: `Replaced ${occurrences} occurrence(s) of "${searchText}".` }],
        };
      }

      case 'delete_range_in_document': {
        const documentId = request.params.arguments?.documentId as string;
        const startIndex = request.params.arguments?.startIndex as number;
        const endIndex = request.params.arguments?.endIndex as number;
        await docsClient.deleteRange(documentId, startIndex, endIndex);
        return {
          content: [{ type: 'text', text: `Deleted content between index ${startIndex} and ${endIndex}.` }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

let transport: SSEServerTransport;

// Endpoint to establish SSE connection
app.get('/sse', async (req, res) => {
  transport = new SSEServerTransport('/message', res);
  await server.connect(transport);
  console.log('MCP SSE connection established');
});

// Endpoint to handle incoming messages from client
app.post('/message', express.json(), async (req, res) => {
  if (transport) {
    // express.json() has already consumed the raw stream, so the parsed body
    // must be handed to the transport explicitly.
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(503).send('SSE Connection not established yet');
  }
});

// Start the HTTP server
app.listen(port, () => {
  console.log(`Google Sheets MCP Server listening on port ${port}`);
  console.log(`SSE endpoint available at http://localhost:${port}/sse`);
});
