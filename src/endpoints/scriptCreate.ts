import { OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { ScriptMetadata } from "../types";

export class ScriptCreate extends OpenAPIRoute {
  schema = {
    tags: ["Scripts"],
    summary: "Add or update a script for a video",
    security: [{ ApiKey: [] }],
    request: {
      params: z.object({
        videoUrl: Str({
          description: "Encoded video URL",
        }),
        scriptUrl: Str({
          description: "Encoded script URL",
        }),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              metadata: ScriptMetadata,
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Script updated successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              message: Str(),
              data: ScriptMetadata,
            }),
          },
        },
      },
      "401": {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: z.object({
              error: Str(),
            }),
          },
        },
      },
      "400": {
        description: "Bad request",
        content: {
          "application/json": {
            schema: z.object({
              error: Str(),
            }),
          },
        },
      },
    },
  };

  async handle(c) {
    // Check authorization
    const apiKey = c.req.header("X-API-Key");

    if (apiKey != c.env.API_KEY) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = await this.getValidatedData<typeof this.schema>();
    const { videoUrl, scriptUrl } = data.params;
    const { metadata } = data.body;

    metadata.lastUpdated = new Date().toISOString();

    // Get existing scripts
    let scripts = {};
    const existingData = await c.env.IVE_SCRIPTS.get(videoUrl);

    if (existingData) {
      scripts = JSON.parse(existingData);
    }

    // Update script metadata
    scripts[scriptUrl] = {
      ...scripts[scriptUrl],
      ...metadata,
    };

    // If this is marked as default, remove default from others
    if (metadata.isDefault) {
      Object.keys(scripts).forEach((url) => {
        if (url !== scriptUrl && scripts[url].isDefault) {
          scripts[url].isDefault = false;
        }
      });
    }

    // Save to KV
    await c.env.IVE_SCRIPTS.put(videoUrl, JSON.stringify(scripts));

    return c.json({
      success: true,
      message: "Script metadata updated",
      data: scripts[scriptUrl],
    });
  }
}
