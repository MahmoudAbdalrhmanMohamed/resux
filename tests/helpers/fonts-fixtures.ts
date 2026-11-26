export function createMockResux() {
  const headList: Array<{ link?: any[]; style?: any[]; script?: any[]; noscript?: any[] }> = [];
  const runtimeConfigs: any[] = [];

  return {
    headList,
    runtimeConfigs,
    resux: {
      addHead(head: { link?: any[]; script?: any[]; noscript?: any[] }) {
        headList.push(head);
      },
      extendRuntimeConfig(config: any) {
        runtimeConfigs.push(config);
      }
    }
  };
}
