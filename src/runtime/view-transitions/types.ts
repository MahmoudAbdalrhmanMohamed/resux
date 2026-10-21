export interface ResuxViewTransition {
  readonly isSupported: boolean;
  start: (updateCallback: () => Promise<void> | void) => Promise<void>;
}

export interface ResuxViewTransitionOptions {
  viewTransition?: boolean;
}
