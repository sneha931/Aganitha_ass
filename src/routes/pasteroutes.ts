import { Router } from "express";
import { healthcheck,createPaste,getPaste} from "../controllers/past.controllers.js";

const router=Router();
router.get("/healthcheck",healthcheck);
router.post("/pastes",createPaste);
router.get("/pastes/:id",getPaste);


export default router;