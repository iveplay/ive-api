import { OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { Env, ScriptMetadata } from "../types";
import {
  ensureDefaultScript,
  isValidScriptUrl,
  isValidVideoUrl,
} from "../utils/scriptUtils";
import { Context } from "hono";

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

  async handle(c: Context<{ Bindings: Env }>) {
    try {
      // Check authorization
      const apiKey = c.req.header("X-API-Key");
      if (apiKey !== c.env.API_KEY) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const data = await this.getValidatedData<typeof this.schema>();
      const { videoUrl: encodedVideoUrl, scriptUrl: encodedScriptUrl } =
        data.params;
      const { metadata } = data.body;

      // Decode the URLs
      const videoUrl = decodeURIComponent(encodedVideoUrl);
      const scriptUrl = decodeURIComponent(encodedScriptUrl);

      // Validate URLs
      if (!isValidVideoUrl(videoUrl)) {
        return c.json({ error: "Invalid video URL format" }, 400);
      }

      if (!isValidScriptUrl(scriptUrl)) {
        return c.json(
          {
            error:
              "Invalid script URL format. Must end with .funscript or .csv",
          },
          400
        );
      }

      metadata.lastUpdated = new Date().toISOString();

      // Get existing scripts
      let scripts = {};
      const existingData = await c.env.IVE_SCRIPTS.get(videoUrl);

      if (existingData) {
        try {
          scripts = JSON.parse(existingData);
        } catch (error) {
          console.error("Error parsing existing scripts:", error);
          scripts = {};
        }
      }

      // Update script metadata
      scripts[scriptUrl] = {
        ...scripts[scriptUrl],
        ...metadata,
      };

      // Ensure default script handling
      if (metadata.isDefault) {
        await ensureDefaultScript(
          c.env.IVE_SCRIPTS,
          videoUrl,
          scripts,
          scriptUrl
        );
      } else if (Object.keys(scripts).length === 1) {
        // If this is the only script, make it default regardless
        scripts[scriptUrl].isDefault = true;
      }

      // Save to KV
      await c.env.IVE_SCRIPTS.put(videoUrl, JSON.stringify(scripts));

      return c.json({
        success: true,
        message: "Script metadata updated",
        data: scripts[scriptUrl],
      });
    } catch (error) {
      console.error("Error in scriptCreate:", error);
      return c.json(
        {
          error: "Internal server error",
          details: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  }
}
