// RESOURCE: profile://contact
import { readFile } from "node:fs/promises"
import path from "node:path"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { DATA_DIR } from "../utils/paths.js"

/**
 * Contact info resource ko server par register karta hai
 */
export function registerContactInfoResource(server: McpServer) {
  server.registerResource(
    "contact_info",
    "profile://contact",
    {
      description: "The user's contact information (JSON)",
      mimeType: "application/json",
    },
    async (uri) => {
      try {
        const content = await readFile(
          path.join(DATA_DIR, "contact.json"),
          "utf-8"
        )

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: content,
          }],
        }
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: "text/plain",
            text: `Error reading contact: ${error instanceof Error ? error.message : "Unknown"}`,
          }],
        }
      }
    }
  )
}