const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || "Server Error";

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier";
  }

  if (err.code === 11000) {
    statusCode = 400;
    const duplicateField = Object.keys(err.keyValue || {})[0];
    message = duplicateField
      ? `${duplicateField} already exists`
      : "Duplicate value already exists";
  }

  if (err.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    message = "Uploaded file is too large";
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;
