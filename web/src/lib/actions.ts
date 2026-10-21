"use server";

import { refresh } from "next/cache";
import { apiSend, apiUpload } from "./api";
import type { ParsedStatement, TargetType } from "./types";

const RESOURCES = ["loans", "cards", "card-installments", "others", "accounts"] as const;
export type Resource = (typeof RESOURCES)[number];
export type ActionResult = { error?: string };

function checkResource(resource: string): resource is Resource {
  return (RESOURCES as readonly string[]).includes(resource);
}

export async function saveEntity(resource: Resource, data: Record<string, unknown>): Promise<ActionResult> {
  if (!checkResource(resource)) return { error: "Geçersiz kayıt türü." };
  const id = typeof data.id === "number" && data.id > 0 ? data.id : null;
  const result = id
    ? await apiSend("PUT", `/${resource}/${id}`, data)
    : await apiSend("POST", `/${resource}`, data);
  if (!result.error) refresh();
  return result;
}

export async function deleteEntity(resource: Resource, id: number): Promise<ActionResult> {
  if (!checkResource(resource)) return { error: "Geçersiz kayıt türü." };
  const result = await apiSend("DELETE", `/${resource}/${Number(id)}`);
  if (!result.error) refresh();
  return result;
}

export type PaymentInput = {
  targetType: TargetType;
  targetId: number;
  amount: number | null;
  date: string;
  accountId: number | null;
  installmentCount: number | null;
  note: string | null;
};

export async function recordPayment(input: PaymentInput): Promise<ActionResult> {
  const result = await apiSend("POST", "/payments", input);
  if (!result.error) refresh();
  return result;
}

/** Ödemeyi siler; backend borca ve hesaba etkisini geri çevirir. */
export async function undoPayment(id: number): Promise<ActionResult> {
  const result = await apiSend("DELETE", `/payments/${Number(id)}`);
  if (!result.error) refresh();
  return result;
}

export type StatementResult = { error?: string; needsPassword?: boolean; statement?: ParsedStatement };

/** Ekstre dosyasını backend'e okutur. Hiçbir kaydı değiştirmez; uygulama kart kaydıyla (saveEntity) yapılır. */
export async function parseStatement(formData: FormData): Promise<StatementResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Dosya seçilmedi." };
  if (file.size > 15 * 1024 * 1024) return { error: "Dosya çok büyük (en fazla 15 MB)." };
  const body = new FormData();
  body.set("file", file);
  const password = formData.get("password");
  if (typeof password === "string" && password) body.set("password", password);
  const { data, error } = await apiUpload<ParsedStatement & { needsPassword?: boolean }>("/statements/parse", body);
  if (error) return { error, needsPassword: data?.needsPassword };
  return { statement: data };
}
