import { fromNodeMiddleware } from "h3";
import { createResuxNodeHandler } from "@mahmoud-abdelrahman/resux/node";

export default fromNodeMiddleware(createResuxNodeHandler());
