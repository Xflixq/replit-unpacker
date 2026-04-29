import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stripRouter from "./strip";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stripRouter);

export default router;
