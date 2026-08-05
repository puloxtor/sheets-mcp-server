import express from 'express';
import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { GoogleSheetsClient } from './sheets';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Google Sheets Client
const sheetsClient = new GoogleSheetsClient();

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
    await transport.handlePostMessage(req, res);
  } else {
    res.status(503).send('SSE Connection not established yet');
  }
});

// Start the HTTP server
app.listen(port, () => {
  console.log(`Google Sheets MCP Server listening on port ${port}`);
  console.log(`SSE endpoint available at http://localhost:${port}/sse`);
});
