import { fromNodeMiddleware } from "h3";
import { createResuxNodeHandler } from "@resux/resux/node";

export default fromNodeMiddleware(createResuxNodeHandler());
