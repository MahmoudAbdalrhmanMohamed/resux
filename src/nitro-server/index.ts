export interface ResuxNitroServerOptions {
  appRoot: string;
  outDir: string;
  preset?: string;
  compatibilityDate?: string;
}

export function createNitroServerOptions(options: ResuxNitroServerOptions): ResuxNitroServerOptions {
  return options;
}
