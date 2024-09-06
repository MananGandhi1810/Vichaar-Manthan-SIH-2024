import { Router } from "express";
import {
    registerHandler,
    loginHandler,
    userDataHandler,
} from "../handlers/auth.js";

import { checkAuth } from "../middlewares/auth.js";

var router = Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.get("/user", checkAuth, userDataHandler);

export default router;
