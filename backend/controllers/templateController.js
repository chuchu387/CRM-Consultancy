const DocumentTemplate = require("../models/DocumentTemplate");

const normalizeTemplateDocuments = (documents = []) =>
  documents
    .map((item) => ({
      documentName: (item.documentName || "").trim(),
      description: (item.description || "").trim(),
    }))
    .filter((item) => item.documentName);

const createTemplate = async (req, res, next) => {
  try {
    const { name, country, visaType, documents = [] } = req.body;
    const normalizedDocuments = normalizeTemplateDocuments(documents);

    if (!name || !country || !visaType || !normalizedDocuments.length) {
      return res.status(400).json({
        success: false,
        message: "Name, country, visa type, and at least one document are required",
      });
    }

    const template = await DocumentTemplate.create({
      name: name.trim(),
      country: country.trim(),
      visaType: visaType.trim(),
      documents: normalizedDocuments,
      createdBy: req.user.id,
    });

    const populatedTemplate = await DocumentTemplate.findById(template._id).populate(
      "createdBy",
      "name email"
    );

    return res.status(201).json({
      success: true,
      data: populatedTemplate,
      message: "Checklist template created successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getTemplates = async (req, res, next) => {
  try {
    const templates = await DocumentTemplate.find()
      .populate("createdBy", "name email")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      data: templates,
      message: "Checklist templates retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const updateTemplate = async (req, res, next) => {
  try {
    const { name, country, visaType, documents = [] } = req.body;
    const normalizedDocuments = normalizeTemplateDocuments(documents);

    if (!name || !country || !visaType || !normalizedDocuments.length) {
      return res.status(400).json({
        success: false,
        message: "Name, country, visa type, and at least one document are required",
      });
    }

    const template = await DocumentTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Checklist template not found",
      });
    }

    template.name = name.trim();
    template.country = country.trim();
    template.visaType = visaType.trim();
    template.documents = normalizedDocuments;

    await template.save();

    const populatedTemplate = await DocumentTemplate.findById(template._id).populate(
      "createdBy",
      "name email"
    );

    return res.status(200).json({
      success: true,
      data: populatedTemplate,
      message: "Checklist template updated successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const deleteTemplate = async (req, res, next) => {
  try {
    const template = await DocumentTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Checklist template not found",
      });
    }

    await template.deleteOne();

    return res.status(200).json({
      success: true,
      data: null,
      message: "Checklist template deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  updateTemplate,
  deleteTemplate,
};
