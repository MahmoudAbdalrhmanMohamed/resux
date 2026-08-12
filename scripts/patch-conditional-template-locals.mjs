import { readFile, writeFile } from "node:fs/promises";

const compilerPath = new URL("../src/compiler/index.ts", import.meta.url);
let source = await readFile(compilerPath, "utf8");

const oldBlock = `  if (options.ifExpressionOverride) {\n    element.if = {\n      expression: registerRawTemplateExpression(options.ifExpressionOverride, options.ifExpressionOverride, [], state),\n      blockId: nextBindingId(state),\n    };\n  }`;
const newBlock = `  if (options.ifExpressionOverride) {\n    const conditionalExpression = transformTemplateExpressionCode(\n      options.ifExpressionOverride,\n      state.templateRefBindings,\n      state.file,\n      node,\n    );\n    element.if = {\n      expression: registerRawTemplateExpression(\n        conditionalExpression.transformed,\n        options.ifExpressionOverride,\n        conditionalExpression.identifiers,\n        state,\n      ),\n      blockId: nextBindingId(state),\n    };\n  }`;

if (!source.includes(oldBlock)) {
  throw new Error("conditional expression registration anchor not found");
}
source = source.replace(oldBlock, newBlock);
await writeFile(compilerPath, source, "utf8");
console.log("Conditional-chain expressions now retain their free identifiers, including v-for locals.");
