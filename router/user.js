import { Router } from "express";
import { userResumeHandler } from "../handlers/user.js";

import { checkAuth } from "../middlewares/auth.js";

var router = Router();

router.post("/resume", checkAuth, userResumeHandler);
router.get("/resume", checkAuth, userResumeHandler);

export default router;
