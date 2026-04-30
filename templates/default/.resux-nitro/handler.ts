import { fromNodeMiddleware } from "h3";
import { createResuxNodeHandler } from "resux/node";

export default fromNodeMiddleware(createResuxNodeHandler());
