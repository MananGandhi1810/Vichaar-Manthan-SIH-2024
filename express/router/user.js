import { Router } from "express";
import {
  getResumeHandler,
  getResumeWithIdHandler,
  getQuestionsHandler,
  uploadResumeHandler,
  setAnswerHandler,
  getFeedbackHandler,
} from "../handlers/user.js";

import { checkAuth } from "../middlewares/auth.js";

var userRouter = Router();

userRouter.post("/resume/:role", checkAuth, uploadResumeHandler);
userRouter.get("/resume/:role", checkAuth, getResumeHandler);
userRouter.get("/resume/:role/:id", checkAuth, getResumeWithIdHandler);
userRouter.get("/questions/:role/:id", checkAuth, getQuestionsHandler);
userRouter.post("/questions/:role/:id/:index", checkAuth, setAnswerHandler);
userRouter.get(
  "/questions/:role/:id/getFeedback",
  checkAuth,
  getFeedbackHandler,
);

export default userRouter;
