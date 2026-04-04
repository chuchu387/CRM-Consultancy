const express = require("express");

const {
  getMyNotifications,
  getPushConfig,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToPush,
  unsubscribeFromPush,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/public-key", protect, getPushConfig);
router.get("/my", protect, getMyNotifications);
router.post("/subscribe", protect, subscribeToPush);
router.delete("/unsubscribe", protect, unsubscribeFromPush);
router.patch("/read-all", protect, markAllNotificationsRead);
router.patch("/:id/read", protect, markNotificationRead);

module.exports = router;
