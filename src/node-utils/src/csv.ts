import * as fs from "node:fs/promises";

export class CSV {
  _data: Record<string, unknown>[] = [];
  enc = new TextEncoder();
  sep = ",";

  constructor() {}

  append(data: Record<string, unknown>) {
    this._data.push(data);
  }

  private headers(): string[] {
    const set = new Set<string>();
    for (const record of this._data) {
      for (const header of Object.keys(record)) {
        set.add(header);
      }
    }
    return Array.from(set);
  }

  async writeToFile(path: string) {
    const headers = this.headers();
    const f = await fs.open(path, "w+");
    await f.write(this.enc.encode(headers.join(this.sep) + "\n"));
    for (const data of this._data) {
      const row: string[] = [];
      for (const header of headers) {
        const cell = this.escapeCSVField(String(data[header]));
        row.push(cell);
      }
      await f.write(this.enc.encode(row.join(this.sep) + "\n"));
    }
    await f.close();
  }

  private escapeCSVField(field: string): string {
    if (
      field.includes('"') ||
      field.includes(this.sep) ||
      field.includes("\n")
    ) {
      field = field.replace(/"/g, '""');
      field = `"${field}"`;
    }
    return field;
  }
}
