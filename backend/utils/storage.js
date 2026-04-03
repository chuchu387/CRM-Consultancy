const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const { v2: cloudinary } = require("cloudinary");

const uploadsDir = path.join(__dirname, "../uploads");

const sanitizeSegment = (value = "", fallback = "file") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;

const configureCloudinary = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary environment variables are not configured");
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
};

const getResourceType = (mimeType = "") => (mimeType.startsWith("image/") ? "image" : "raw");

const buildPublicId = (fileName = "", mimeType = "", fallbackName = "file") => {
  const extension = path.extname(fileName).toLowerCase();
  const baseName = sanitizeSegment(path.basename(fileName, extension), fallbackName);
  const prefix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const resourceType = getResourceType(mimeType);

  return {
    publicId:
      resourceType === "raw" && extension
        ? `${prefix}-${baseName}${extension}`
        : `${prefix}-${baseName}`,
    resourceType,
  };
};

const uploadBuffer = async ({ buffer, fileName, mimeType, folder, fallbackName = "file" }) => {
  if (!buffer) {
    throw new Error("File buffer is required");
  }

  configureCloudinary();

  const { publicId, resourceType } = buildPublicId(fileName, mimeType, fallbackName);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        overwrite: false,
        resource_type: resourceType,
        use_filename: false,
        unique_filename: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          url: result.secure_url || result.url,
          publicId: result.public_id,
          resourceType: result.resource_type || resourceType,
        });
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

const removeCloudinaryAsset = async ({ publicId, resourceType = "image" }) => {
  if (!publicId) {
    return;
  }

  configureCloudinary();

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Cloudinary delete failed:", error.message);
    }
  }
};

const removeLegacyUploadedFile = (fileUrl = "") => {
  if (!fileUrl) {
    return;
  }

  try {
    const parsedUrl = new URL(fileUrl);
    const filename = path.basename(parsedUrl.pathname || "");

    if (!filename) {
      return;
    }

    const targetPath = path.join(uploadsDir, filename);

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
  } catch (error) {
    const filename = path.basename(fileUrl);
    const targetPath = path.join(uploadsDir, filename);

    if (filename && fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
  }
};

const removeStoredAsset = async ({ publicId = "", resourceType = "image", fileUrl = "" }) => {
  if (publicId) {
    await removeCloudinaryAsset({ publicId, resourceType });
    return;
  }

  removeLegacyUploadedFile(fileUrl);
};

module.exports = {
  uploadBuffer,
  removeStoredAsset,
};
