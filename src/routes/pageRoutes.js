import express from "express";
import { getHomePageData, getFreshHomePageData } from "../controllers/pagesController.js";

const router = express.Router();

router.get("/home", getHomePageData);

router.get("/home/fresh", getFreshHomePageData);

export default router;