const isConsultancy = (req, res, next) => {
  if (req.user?.role !== "consultancy") {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  return next();
};

const isStudent = (req, res, next) => {
  if (req.user?.role !== "student") {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  return next();
};

module.exports = {
  isConsultancy,
  isStudent,
};
