import { Router } from "express";
import {
  listFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favorites.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listFavorites));
router.post("/", asyncHandler(addFavorite));
router.delete("/:doctor_id", asyncHandler(removeFavorite));

export default router;