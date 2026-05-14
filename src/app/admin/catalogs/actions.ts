"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { adminAudit } from "@/lib/admin-audit";
import { requireAdmin, AdminUnauthorizedError } from "@/lib/admin-current-user";
import { prisma } from "@/lib/db";
import {
  catalogCreateSchema,
  catalogUpdateSchema,
  catalogValueCreateSchema,
  catalogValueUpdateSchema,
} from "@/lib/schemas/catalogs";

type Result = { ok: true; id?: string } | { ok: false; error: string };

async function adminContext() {
  try {
    return await requireAdmin();
  } catch (e) {
    if (e instanceof AdminUnauthorizedError) return null;
    throw e;
  }
}

export async function createCatalogAction(input: unknown): Promise<Result> {
  const admin = await adminContext();
  if (!admin) return { ok: false, error: "unauthorized" };
  let data;
  try {
    data = catalogCreateSchema.parse(input);
  } catch (e) {
    return { ok: false, error: e instanceof ZodError ? e.issues[0]?.message ?? "validation" : "validation" };
  }
  const exists = await prisma.attributeCatalog.findUnique({ where: { slug: data.slug } });
  if (exists) return { ok: false, error: "slug_in_use" };
  const created = await prisma.attributeCatalog.create({ data });
  await adminAudit({
    admin_subject: admin.sub,
    admin_username: admin.preferred_username ?? null,
    action: "catalog_created",
    resource: `attribute_catalog:${created.slug}`,
    metadata: { id: created.id },
  });
  revalidatePath("/admin/catalogs");
  return { ok: true, id: created.id };
}

export async function updateCatalogAction(id: string, input: unknown): Promise<Result> {
  const admin = await adminContext();
  if (!admin) return { ok: false, error: "unauthorized" };
  let patch;
  try {
    patch = catalogUpdateSchema.parse(input);
  } catch (e) {
    return { ok: false, error: e instanceof ZodError ? e.issues[0]?.message ?? "validation" : "validation" };
  }
  const updated = await prisma.attributeCatalog.update({ where: { id }, data: patch });
  await adminAudit({
    admin_subject: admin.sub,
    admin_username: admin.preferred_username ?? null,
    action: patch.active === false ? "catalog_deactivated" : "catalog_updated",
    resource: `attribute_catalog:${updated.slug}`,
    metadata: { id, changes: Object.keys(patch) },
  });
  revalidatePath("/admin/catalogs");
  revalidatePath(`/admin/catalogs/${updated.slug}`);
  return { ok: true, id };
}

export async function createCatalogValueAction(catalogId: string, input: unknown): Promise<Result> {
  const admin = await adminContext();
  if (!admin) return { ok: false, error: "unauthorized" };
  let data;
  try {
    data = catalogValueCreateSchema.parse(input);
  } catch (e) {
    return { ok: false, error: e instanceof ZodError ? e.issues[0]?.message ?? "validation" : "validation" };
  }
  const catalog = await prisma.attributeCatalog.findUnique({ where: { id: catalogId } });
  if (!catalog) return { ok: false, error: "catalog_not_found" };
  const exists = await prisma.attributeCatalogValue.findUnique({
    where: { catalog_id_slug: { catalog_id: catalogId, slug: data.slug } },
  });
  if (exists) return { ok: false, error: "slug_in_use" };
  const created = await prisma.attributeCatalogValue.create({
    data: { ...data, catalog_id: catalogId },
  });
  await adminAudit({
    admin_subject: admin.sub,
    admin_username: admin.preferred_username ?? null,
    action: "catalog_value_added",
    resource: `attribute_catalog:${catalog.slug}:${created.slug}`,
    metadata: { catalog_id: catalogId, value_id: created.id },
  });
  revalidatePath(`/admin/catalogs/${catalog.slug}`);
  return { ok: true, id: created.id };
}

export async function updateCatalogValueAction(
  catalogId: string,
  valueId: string,
  input: unknown,
): Promise<Result> {
  const admin = await adminContext();
  if (!admin) return { ok: false, error: "unauthorized" };
  let patch;
  try {
    patch = catalogValueUpdateSchema.parse(input);
  } catch (e) {
    return { ok: false, error: e instanceof ZodError ? e.issues[0]?.message ?? "validation" : "validation" };
  }
  const catalog = await prisma.attributeCatalog.findUnique({ where: { id: catalogId } });
  if (!catalog) return { ok: false, error: "catalog_not_found" };
  const updated = await prisma.attributeCatalogValue.update({
    where: { id: valueId },
    data: patch,
  });
  await adminAudit({
    admin_subject: admin.sub,
    admin_username: admin.preferred_username ?? null,
    action: patch.active === false ? "catalog_value_deactivated" : "catalog_value_updated",
    resource: `attribute_catalog:${catalog.slug}:${updated.slug}`,
    metadata: { catalog_id: catalogId, value_id: valueId, changes: Object.keys(patch) },
  });
  revalidatePath(`/admin/catalogs/${catalog.slug}`);
  return { ok: true, id: valueId };
}
