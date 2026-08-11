import { protectedProcedure, publicProcedure, router } from "../trpc";
import { userRouter } from "./user";
import { studentRouter } from "./student";

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
});
export type AppRouter = typeof appRouter;
