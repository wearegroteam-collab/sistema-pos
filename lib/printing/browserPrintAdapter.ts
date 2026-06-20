export type BrowserPrintOptions = {
  label?: string;
};

export function browserPrintAdapter(_options: BrowserPrintOptions = {}) {
  if (typeof window !== "undefined") {
    window.print();
  }
}
