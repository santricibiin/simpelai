import { getAppSetting, setAppSetting } from "./app-settings";

export type ContactSettings = {
  telegram: string;
  whatsapp: string;
};

const DEFAULTS: ContactSettings = { telegram: "", whatsapp: "" };

export async function getContact(): Promise<ContactSettings> {
  const raw = await getAppSetting<Partial<ContactSettings>>("contact", {});
  return {
    telegram: typeof raw.telegram === "string" ? raw.telegram.trim() : DEFAULTS.telegram,
    whatsapp: typeof raw.whatsapp === "string" ? raw.whatsapp.trim() : DEFAULTS.whatsapp,
  };
}

export async function setContact(contact: ContactSettings): Promise<void> {
  await setAppSetting("contact", contact);
}
