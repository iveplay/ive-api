import { OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { ScriptMetadataType } from "../types";

export class ScriptDelete extends OpenAPIRoute {
  schema = {
    tags: ["Scripts"],
    summary: "Delete a script for a video",
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
    },
    responses: {
      "200": {
        description: "Script deleted successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              message: Str(),
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
      "404": {
        description: "Script not found",
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
    const authHeader = c.req.header("Authorization");
    const apiKey = c.req.header("X-API-Key");

    if (apiKey != c.env.API_KEY) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = await this.getValidatedData<typeof this.schema>();
    const { videoUrl, scriptUrl } = data.params;

    // Get existing scripts
    const existingData = await c.env.IVE_SCRIPTS.get(videoUrl);

    if (!existingData) {
      return c.json({ error: "No scripts found for this video" }, 404);
    }

    const scripts: Record<string, ScriptMetadataType> =
      JSON.parse(existingData);

    if (!scripts[scriptUrl]) {
      return c.json({ error: "Script not found" }, 404);
    }

    // Remove script
    delete scripts[scriptUrl];

    // If no scripts remain, delete the whole entry
    if (Object.keys(scripts).length === 0) {
      await c.env.IVE_SCRIPTS.delete(videoUrl);
      return c.json({
        success: true,
        message: "All scripts for video removed",
      });
    }

    // If no default script, set the first one as default
    if (!Object.values(scripts).some((script) => script.isDefault)) {
      const firstScriptUrl = Object.keys(scripts)[0];
      scripts[firstScriptUrl].isDefault = true;
    }

    // Update KV
    await c.env.IVE_SCRIPTS.put(videoUrl, JSON.stringify(scripts));

    return c.json({
      success: true,
      message: "Script removed",
    });
  }
}
