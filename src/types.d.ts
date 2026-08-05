declare module '*.css' {
  const styles: string;
  export default styles;
}

declare module '*.md' {
  const markdown: string;
  export default markdown;
}

declare module 'https://cdn.jsdelivr.net/npm/d3@7/+esm' {
  const d3: unknown;
  export = d3;
}
