import { fromNodeMiddleware } from "h3";
import { createResuxNodeHandler } from "resuxjs/node";

const resuxHandler = createResuxNodeHandler();

export default fromNodeMiddleware((req, res, next) => {
  resuxHandler(req, res);

  if (res.writableEnded) {
    return;
  }

  const done = () => {
    res.off("finish", done);
    res.off("close", done);
    next();
  };

  res.once("finish", done);
  res.once("close", done);
});
