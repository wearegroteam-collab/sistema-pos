import { browserPrintAdapter } from "./browserPrintAdapter";

export type PrintJob = {
  type: "browser";
  label?: string;
};

export function printService(job: PrintJob) {
  if (job.type === "browser") {
    browserPrintAdapter({ label: job.label });
  }
}
