import { protectedProcedure, publicProcedure, router } from "../trpc";
import { caseStudyRouter } from "./case-study";
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
  student: studentRouter,
  studentAssignment: studentAssignmentRouter,
  question: questionRouter,
  caseStudy: caseStudyRouter,
});
export type AppRouter = typeof appRouter;
