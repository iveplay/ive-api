import { OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { Env, ScriptMetadata } from "../types";
import { getScriptsForVideo } from "../utils/scriptUtils";
import { Context } from "hono";

export class ScriptList extends OpenAPIRoute {
  schema = {
    tags: ["Scripts"],
    summary: "List scripts for a video",
    request: {
      params: z.object({
        videoUrl: Str({
          description: "Encoded video URL",
        }),
      }),
    },
    responses: {
      "200": {
        description: "Returns scripts for a video",
        content: {
          "application/json": {
            schema: z.record(ScriptMetadata),
          },
        },
      },
      "404": {
        description: "No scripts found",
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
      const data = await this.getValidatedData<typeof this.schema>();
      const { videoUrl: encodedVideoUrl } = data.params;

      // Decode the URL
      const videoUrl = decodeURIComponent(encodedVideoUrl);

      // Get scripts from KV
      const scripts = await getScriptsForVideo(c.env.IVE_SCRIPTS, videoUrl);

      if (!scripts) {
        return c.json({ error: "No scripts found for this video" }, 404);
      }

      return c.json(scripts);
    } catch (error) {
      console.error("Error in scriptList:", error);
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
