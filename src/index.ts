import { fromHono } from "chanfana";
import { Hono } from "hono";
import { ScriptList } from "./endpoints/scriptList";
import { ScriptCreate } from "./endpoints/scriptCreate";
import { ScriptDelete } from "./endpoints/scriptDelete";

const app = new Hono();

const openapi = fromHono(app, {
  docs_url: "/",
});

const BASE_PATH = "/scripts/v1";

openapi.get(`${BASE_PATH}/:videoUrl`, ScriptList);
openapi.post(`${BASE_PATH}/:videoUrl/:scriptUrl`, ScriptCreate);
openapi.delete(`${BASE_PATH}/:videoUrl/:scriptUrl`, ScriptDelete);

export default app;
