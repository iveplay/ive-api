import { OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { ScriptMetadata } from "../types";

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

  async handle(c) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { videoUrl } = data.params;

    // Get scripts from KV
    const scripts = await c.env.IVE_SCRIPTS.get(videoUrl);

    if (!scripts) {
      return c.json({ error: "No scripts found for this video" }, 404);
    }

    return c.json(JSON.parse(scripts));
  }
}
