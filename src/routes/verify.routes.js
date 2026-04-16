const express = require("express")
const router = express.Router()
const verifyController = require("../controllers/verify.controller")
const authMiddleware = require("../middleware/auth.middleware")

router.post("/email/confirm", authMiddleware, verifyController.confirmEmail)
router.post("/phone/confirm", authMiddleware, verifyController.confirmPhone)
router.post("/gov/confirm", authMiddleware, verifyController.confirmGovId)

module.exports = router
