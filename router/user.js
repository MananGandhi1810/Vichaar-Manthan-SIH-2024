import { Router } from "express";
import {
    getResumeHandler,
    getResumeWithIdHandler,
    getQuestionsHandler,
    uploadResumeHandler,
} from "../handlers/user.js";

import { checkAuth } from "../middlewares/auth.js";

var userRouter = Router();

userRouter.post("/resume/:role", checkAuth, uploadResumeHandler);
userRouter.get("/resume/:role", checkAuth, getResumeHandler);
userRouter.get("/resume/:role/:id", checkAuth, getResumeWithIdHandler);
userRouter.get("/questions/:role/:id", checkAuth, getQuestionsHandler);

export default userRouter;
