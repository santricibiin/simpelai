import { promises as fs } from "node:fs";
import path from "node:path";

const FILE = "data/contact.json";

export type ContactSettings = {
  telegram: string;
  whatsapp: string;
};

const DEFAULTS: ContactSettings = { telegram: "", whatsapp: "" };

export async function getContact(): Promise<ContactSettings> {
  try {
    const raw = JSON.parse(await fs.readFile(FILE, "utf8")) as Partial<ContactSettings>;
    return {
      telegram: typeof raw.telegram === "string" ? raw.telegram.trim() : DEFAULTS.telegram,
      whatsapp: typeof raw.whatsapp === "string" ? raw.whatsapp.trim() : DEFAULTS.whatsapp,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function setContact(contact: ContactSettings): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(contact, null, 2) + "\n", { mode: 0o600 });
}
