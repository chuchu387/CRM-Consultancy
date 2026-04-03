const User = require("../models/User");
const { removeStoredAsset, uploadBuffer } = require("../utils/storage");

const getAllStudents = async (req, res, next) => {
  try {
    const students = await User.find({ role: "student" })
      .select("name email phone address avatarUrl createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: students,
      message: "Students retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getAllConsultancies = async (req, res, next) => {
  try {
    const consultancies = await User.find({ role: "consultancy" })
      .select("name email avatarUrl createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: consultancies,
      message: "Consultancy users retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const nextName = (req.body.name || "").trim();
    const nextPhone = typeof req.body.phone === "string" ? req.body.phone.trim() : user.phone;
    const nextAddress =
      typeof req.body.address === "string" ? req.body.address.trim() : user.address;

    if (!nextName) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    user.name = nextName;
    user.phone = nextPhone;
    user.address = nextAddress;

    if (req.file) {
      await removeStoredAsset({
        publicId: user.avatarPublicId,
        resourceType: user.avatarResourceType || "image",
        fileUrl: user.avatarUrl,
      });

      const uploadedAvatar = await uploadBuffer({
        buffer: req.file.buffer,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        folder: "crm-consultancy/avatars",
        fallbackName: user.name || "avatar",
      });

      user.avatarUrl = uploadedAvatar.url;
      user.avatarPublicId = uploadedAvatar.publicId;
      user.avatarResourceType = uploadedAvatar.resourceType;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      data: user,
      message: "Profile updated successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const changeMyPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isCurrentPasswordValid = await user.matchPassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    user.password = newPassword.trim();
    await user.save();

    return res.status(200).json({
      success: true,
      data: null,
      message: "Password updated successfully",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllStudents,
  getAllConsultancies,
  updateMyProfile,
  changeMyPassword,
};
