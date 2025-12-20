declare module "diff" {
  export function diffLines(oldStr: string, newStr: string): any[];
}

declare module "prismjs" {
  const Prism: any;
  export default Prism;
}

declare module "uuid";
