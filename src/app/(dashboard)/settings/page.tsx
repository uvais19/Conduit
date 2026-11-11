import { connection } from "next/server";
import { isEncryptionConfigured } from "@/lib/encryption";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  await connection();
  return <SettingsForm encryptionConfigured={isEncryptionConfigured()} />;
}
