import { useEffect, useMemo, useState } from "react";
import { HiOutlineCamera, HiOutlineKey, HiOutlineUserCircle } from "react-icons/hi2";
import { toast } from "react-toastify";

import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const acceptedImageTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  useEffect(() => {
    setProfileForm({
      name: user?.name || "",
      phone: user?.phone || "",
      address: user?.address || "",
    });
  }, [user]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  const displayAvatar = avatarPreview || user?.avatarUrl || "";

  const hasProfileChanges = useMemo(
    () =>
      profileForm.name.trim() !== (user?.name || "") ||
      profileForm.phone.trim() !== (user?.phone || "") ||
      profileForm.address.trim() !== (user?.address || "") ||
      Boolean(avatarFile),
    [avatarFile, profileForm.address, profileForm.name, profileForm.phone, user]
  );

  const handleProfileFieldChange = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
    setProfileErrors((current) => ({ ...current, [field]: "" }));
  };

  const handlePasswordFieldChange = (field, value) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
    setPasswordErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleAvatarChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!acceptedImageTypes.includes(selectedFile.type)) {
      toast.error("Only JPG, JPEG, PNG, and WEBP images are allowed");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Profile image must be 5MB or smaller");
      event.target.value = "";
      return;
    }

    setAvatarFile(selectedFile);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!profileForm.name.trim()) {
      nextErrors.name = "Name is required";
    }

    setProfileErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    const formData = new FormData();
    formData.append("name", profileForm.name.trim());
    formData.append("phone", profileForm.phone.trim());
    formData.append("address", profileForm.address.trim());

    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    setProfileSubmitting(true);

    try {
      const response = await api.patch("/users/profile", formData);
      updateUser(response.data.data);
      setAvatarFile(null);
      toast.success(response.data.message || "Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update profile");
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!passwordForm.currentPassword.trim()) {
      nextErrors.currentPassword = "Current password is required";
    }

    if (!passwordForm.newPassword.trim()) {
      nextErrors.newPassword = "New password is required";
    } else if (passwordForm.newPassword.trim().length < 6) {
      nextErrors.newPassword = "New password must be at least 6 characters";
    }

    if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setPasswordErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setPasswordSubmitting(true);

    try {
      const response = await api.patch("/users/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success(response.data.message || "Password updated successfully");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update password");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
          Profile Settings
        </p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[2rem] bg-blue-100 text-blue-700 shadow-sm">
              {displayAvatar ? (
                <img src={displayAvatar} alt={user?.name || "Profile"} className="h-full w-full object-cover" />
              ) : (
                <span className="font-heading text-3xl font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-heading text-3xl font-semibold text-gray-900">
                {user?.name || "Your profile"}
              </h2>
              <p className="mt-2 text-sm text-gray-500">{user?.email}</p>
              <span
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  user?.role === "consultancy"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {user?.role === "consultancy" ? "Consultancy" : "Student"}
              </span>
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
            <HiOutlineCamera className="h-5 w-5" />
            Choose Profile Image
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </label>
        </div>
      </div>

      <div className={`grid gap-6 ${user?.role === "student" ? "xl:grid-cols-[1.4fr_1fr]" : ""}`}>
        <form
          onSubmit={handleSaveProfile}
          className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <HiOutlineUserCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-heading text-2xl font-semibold text-gray-900">
                Personal details
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Update the name and image shown across the CRM, including the sidebar.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-gray-700">Full Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(event) => handleProfileFieldChange("name", event.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              {profileErrors.name ? (
                <p className="mt-2 text-sm text-rose-600">{profileErrors.name}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Email</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full cursor-not-allowed rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Phone</label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={(event) => handleProfileFieldChange("phone", event.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-gray-700">Address</label>
              <textarea
                rows="4"
                value={profileForm.address}
                onChange={(event) => handleProfileFieldChange("address", event.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          {avatarFile ? (
            <p className="mt-4 text-sm text-gray-500">Selected image: {avatarFile.name}</p>
          ) : null}

          <button
            type="submit"
            disabled={profileSubmitting || !hasProfileChanges}
            className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {profileSubmitting ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {user?.role === "student" ? (
          <form
            onSubmit={handleChangePassword}
            className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <HiOutlineKey className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-heading text-2xl font-semibold text-gray-900">
                  Change password
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Keep your student account secure with a new password.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    handlePasswordFieldChange("currentPassword", event.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
                {passwordErrors.currentPassword ? (
                  <p className="mt-2 text-sm text-rose-600">{passwordErrors.currentPassword}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => handlePasswordFieldChange("newPassword", event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
                {passwordErrors.newPassword ? (
                  <p className="mt-2 text-sm text-rose-600">{passwordErrors.newPassword}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    handlePasswordFieldChange("confirmPassword", event.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
                {passwordErrors.confirmPassword ? (
                  <p className="mt-2 text-sm text-rose-600">{passwordErrors.confirmPassword}</p>
                ) : null}
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordSubmitting}
              className="mt-6 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
            >
              {passwordSubmitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
};

export default Profile;
