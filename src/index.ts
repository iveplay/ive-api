import { fromHono } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { ScriptList } from "./endpoints/scriptList";
import { ScriptCreate } from "./endpoints/scriptCreate";
import { ScriptDelete } from "./endpoints/scriptDelete";
import { Env } from "types";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: ["*"],
    allowHeaders: ["X-API-Key", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

const openapi = fromHono(app, {
  docs_url: "/",
  schema: {
    info: {
      version: "0.1.0",
      title: "IVE Scripts API",
      description:
        "API for mapping video URLs to script URLs for the Interactive Video Extension",
    },
    externalDocs: {
      description: "Find out more about IVE",
      url: "https://github.com/iveplay/ive-api",
    },
    security: [
      {
        ApiKey: [],
      },
    ],
  },
});

const BASE_PATH = "/scripts/v1";

openapi.get(`${BASE_PATH}/:videoUrl`, ScriptList);
openapi.post(`${BASE_PATH}/:videoUrl/:scriptUrl`, ScriptCreate);
openapi.delete(`${BASE_PATH}/:videoUrl/:scriptUrl`, ScriptDelete);

// Simple health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
