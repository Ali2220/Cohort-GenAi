// RESOURCE: resume://master
import { readFile } from "node:fs/promises"
import path from "node:path"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { DATA_DIR } from "../utils/paths.js"

/**
 * Master resume resource ko server par register karta hai
 */
export function registerMasterResumeResource(server: McpServer) {
    server.registerResource(
        "master_resume",
        "resume://master",
        {
            description: "The user's master resume in markdown format",
            mimeType: "text/markdown",
        },
        async (uri) => {
            try {
                const content = await readFile(
                    path.join(DATA_DIR, "master-resume.md"),
                    "utf-8"
                )

                // Empty file check
                if (!content.trim()) {
                    return {
                        contents: [{
                            uri: uri.href,
                            mimeType: "text/plain",
                            text: "Error: master-resume.md file khali hai!",
                        }],
                    }
                }

                return {
                    contents: [{
                        uri: uri.href,
                        mimeType: "text/markdown",
                        text: content,
                    }],
                }
            } catch (error) {
                return {
                    contents: [{
                        uri: uri.href,
                        mimeType: "text/plain",
                        text: `Error reading resume: ${error instanceof Error ? error.message : "Unknown"}`,
                    }],
                }
            }
        }
    )
}