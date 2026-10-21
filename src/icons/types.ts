export type IconMode = "svg" | "css";
export type IconLoadingMode = "eager" | "lazy";

export interface IconPresentationAttributes {
  opacity?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  strokeLinecap?: string;
  strokeLinejoin?: string;
  fillRule?: string;
  clipRule?: string;
}

export interface IconPathData extends IconPresentationAttributes {
  d: string;
}

export interface IconData extends IconPresentationAttributes {
  path?: string;
  paths?: IconPathData[];
  viewBox?: string;
  width?: number | string;
  height?: number | string;
  body?: string;
}

export interface IconProps {
  name: string;
  size?: string | number;
  mode?: IconMode;
  ssr?: boolean;
  lazy?: boolean;
  loading?: IconLoadingMode;
  apiProvider?: string;
  class?: string;
}

export interface ResuxIconsConfig {
  collections?: string[];
  component?: string;
  mode?: IconMode;
  ssr?: boolean;
  apiProvider?: string;
  lazy?: boolean;
  defaultSize?: string | number;
  aliases?: Record<string, string>;
  customCollectionsDir?: string;
}

export interface ParsedIconName {
  prefix: string;
  name: string;
}
