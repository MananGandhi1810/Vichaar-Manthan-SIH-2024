import { Router } from "express";
import { getResumeHandler, uploadResumeHandler } from "../handlers/user.js";

import { checkAuth } from "../middlewares/auth.js";

var userRouter = Router();

userRouter.post("/resume", checkAuth, uploadResumeHandler);
userRouter.get("/resume", checkAuth, getResumeHandler);

export default userRouter;
