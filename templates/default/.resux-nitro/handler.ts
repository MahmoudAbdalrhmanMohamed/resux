import { fromNodeMiddleware } from "h3";
import { createResuxNodeHandler } from "resuxjs/node";

export default fromNodeMiddleware(createResuxNodeHandler());
