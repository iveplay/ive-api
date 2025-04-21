import { OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { ensureDefaultScript, getScriptsForVideo } from "../utils/scriptUtils";
import { Context } from "hono";
import { Env } from "types";

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
      headers: z.object({
        "X-API-Key": Str({
          description: "API key for authorization",
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

      const videoUrl = decodeURIComponent(encodedVideoUrl);
      const scriptUrl = decodeURIComponent(encodedScriptUrl);

      // Get existing scripts
      const scripts = await getScriptsForVideo(c.env.IVE_SCRIPTS, videoUrl);

      if (!scripts) {
        return c.json({ error: "No scripts found for this video" }, 404);
      }

      if (!scripts[scriptUrl]) {
        return c.json({ error: "Script not found" }, 404);
      }

      // Check if we're removing the default script
      const wasDefault = scripts[scriptUrl].isDefault;

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

      // If we removed the default script, ensure a new default is set
      if (wasDefault) {
        await ensureDefaultScript(c.env.IVE_SCRIPTS, videoUrl, scripts);
      } else {
        // Just save the updated scripts
        await c.env.IVE_SCRIPTS.put(videoUrl, JSON.stringify(scripts));
      }

      return c.json({
        success: true,
        message: "Script removed",
      });
    } catch (error) {
      console.error("Error in scriptDelete:", error);
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
