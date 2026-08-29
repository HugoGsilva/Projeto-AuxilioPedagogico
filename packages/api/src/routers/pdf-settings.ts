import { db } from "@auxilio-pedagogico/db";
import { pdfSettings } from "@auxilio-pedagogico/db/schema/domain";
import { TRPCError } from "@trpc/server";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { auditedProcedure } from "../audit";
import { actorFromSession, assertCan } from "../policy";
import { protectedProcedure, router } from "../trpc";

export const pdfSettingsUpdateSchema = z.object({
  schoolName: z.string().trim().min(2).max(200),
  institutionalInfo: z.string().trim().max(2000).nullable(),
});

const pdfSettingsSelect = {
  id: pdfSettings.id,
  schoolName: pdfSettings.schoolName,
  institutionalInfo: pdfSettings.institutionalInfo,
  updatedAt: pdfSettings.updatedAt,
} as const;

export const pdfSettingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const actor = actorFromSession(ctx.session.user);
    assertCan(actor.role, "configurePdfSettings");

    const [row] = await db
      .select(pdfSettingsSelect)
      .from(pdfSettings)
      .orderBy(asc(pdfSettings.createdAt))
      .limit(1);

    // Sem linha ainda (produção antes do primeiro save): o form cria.
    return row ?? null;
  }),

  update: auditedProcedure
    .input(pdfSettingsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      assertCan(actor.role, "configurePdfSettings");

      const institutionalInfo = input.institutionalInfo?.trim()
        ? input.institutionalInfo
        : null;

      return ctx.auditMutation(async (tx) => {
        /* Serializa escritas concorrentes no singleton: sem isso, duas
         * primeiras-gravações simultâneas inseririam duas linhas e a mais
         * nova ficaria invisível para o get (perda silenciosa). O lock é
         * liberado no fim da transação. */
        await tx.execute(sql`select pg_advisory_xact_lock(824642001)`);

        const [existing] = await tx
          .select(pdfSettingsSelect)
          .from(pdfSettings)
          .orderBy(asc(pdfSettings.createdAt))
          .limit(1);

        // Singleton em nível de app: atualiza a linha única ou cria a primeira.
        const [saved] = existing
          ? await tx
              .update(pdfSettings)
              .set({
                schoolName: input.schoolName,
                institutionalInfo,
                updatedById: actor.id,
              })
              .where(eq(pdfSettings.id, existing.id))
              .returning(pdfSettingsSelect)
          : await tx
              .insert(pdfSettings)
              .values({
                schoolName: input.schoolName,
                institutionalInfo,
                updatedById: actor.id,
              })
              .returning(pdfSettingsSelect);

        if (!saved) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Falha ao salvar a configuração do PDF",
          });
        }

        return {
          result: saved,
          audit: {
            action: "pdfSettings.update",
            entityType: "pdfSettings",
            entityId: saved.id,
            before: existing
              ? {
                  schoolName: existing.schoolName,
                  institutionalInfo: existing.institutionalInfo,
                }
              : null,
            after: {
              schoolName: saved.schoolName,
              institutionalInfo: saved.institutionalInfo,
            },
          },
        };
      });
    }),
});
