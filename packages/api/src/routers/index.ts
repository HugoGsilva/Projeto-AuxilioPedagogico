import { protectedProcedure, publicProcedure, router } from "../trpc";
import { auditLogRouter } from "./audit-log";
import { caseStudyRouter } from "./case-study";
import { invitationRouter } from "./invitation";
import { pdfSettingsRouter } from "./pdf-settings";
import { questionRouter } from "./question";
import { studentRouter } from "./student";
import { studentAssignmentRouter } from "./student-assignment";
import { userRouter } from "./user";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  user: userRouter,
  invitation: invitationRouter,
  student: studentRouter,
  studentAssignment: studentAssignmentRouter,
  question: questionRouter,
  caseStudy: caseStudyRouter,
  pdfSettings: pdfSettingsRouter,
  auditLog: auditLogRouter,
});
export type AppRouter = typeof appRouter;
