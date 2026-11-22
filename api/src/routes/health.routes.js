import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({ status: "ok", message: "سرور کلینیک‌یار در حال اجراست" });
});

export default router;