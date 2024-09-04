import { Router } from "express";
import { getResumeHandler, uploadResumeHandler } from "../handlers/user.js";

import { checkAuth } from "../middlewares/auth.js";

var userRouter = Router();

userRouter.post("/resume/:role", checkAuth, uploadResumeHandler);
userRouter.get("/resume/:role", checkAuth, getResumeHandler);

export default userRouter;
