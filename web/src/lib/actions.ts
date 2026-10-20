"use server";

import { refresh } from "next/cache";
import { apiSend } from "./api";
import type { TargetType } from "./types";

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
