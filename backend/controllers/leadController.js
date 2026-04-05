const Lead = require("../models/Lead");
const User = require("../models/User");
const { logAuditEvent } = require("../utils/audit");
const { createNotification } = require("../utils/notification");

const CLOSED_LEAD_STATUSES = new Set(["converted", "lost"]);
const VALID_LEAD_STATUSES = new Set([
  "new",
  "contacted",
  "counseling",
  "documents_pending",
  "application_in_progress",
  "converted",
  "lost",
]);
const VALID_LEAD_SOURCES = new Set([
  "walk_in",
  "website",
  "facebook",
  "instagram",
  "referral",
  "call",
  "whatsapp",
  "other",
]);
const VALID_CONTACT_CHANNELS = new Set(["call", "email", "whatsapp", "walk_in", "other"]);

const populateLeadQuery = (query) =>
  query
    .populate("assignedTo", "name email avatarUrl")
    .populate("createdBy", "name email avatarUrl")
    .populate("convertedStudentId", "name email phone avatarUrl")
    .populate("notes.createdBy", "name email avatarUrl")
    .populate("activityLog.createdBy", "name email avatarUrl");

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");
const normalizeEmail = (value) => normalizeString(value).toLowerCase();

const parseOptionalDate = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} is invalid`);
  }

  return parsed;
};

const appendLeadActivity = ({ lead, action, message, createdBy, metadata = {} }) => {
  lead.activityLog.push({
    action,
    message,
    createdBy,
    metadata,
    createdAt: new Date(),
  });
};

const ensureConsultancyUser = async (userId) => {
  const consultancyUser = await User.findOne({ _id: userId, role: "consultancy" });

  if (!consultancyUser) {
    return null;
  }

  return consultancyUser;
};

const findDuplicateLead = async ({ email, phone, excludeLeadId = null }) => {
  const duplicateChecks = [];

  if (email) {
    duplicateChecks.push({ email });
  }

  if (phone) {
    duplicateChecks.push({ phone });
  }

  if (!duplicateChecks.length) {
    return null;
  }

  const duplicateQuery = {
    status: { $nin: Array.from(CLOSED_LEAD_STATUSES) },
    $or: duplicateChecks,
  };

  if (excludeLeadId) {
    duplicateQuery._id = { $ne: excludeLeadId };
  }

  return Lead.findOne(duplicateQuery).select("name email phone status");
};

const validateLeadIdentity = async ({ email, lead, excludeLeadId = null }) => {
  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail) {
    const matchingUser = await User.findOne({ email: normalizedEmail }).select("_id role");
    const convertedStudentId = String(lead?.convertedStudentId || "");

    if (matchingUser && String(matchingUser._id) !== convertedStudentId) {
      return {
        success: false,
        message: "Email already belongs to an existing user",
      };
    }
  }

  const duplicateLead = await findDuplicateLead({
    email: normalizedEmail,
    phone: normalizeString(lead?.phone) || normalizeString(lead?.pendingPhone),
    excludeLeadId,
  });

  if (duplicateLead) {
    return {
      success: false,
      message: "An active lead with the same email or phone already exists",
    };
  }

  return {
    success: true,
    email: normalizedEmail,
  };
};

const getLeads = async (req, res, next) => {
  try {
    const filters = {};
    const search = normalizeString(req.query.search);

    if (req.query.status && VALID_LEAD_STATUSES.has(req.query.status)) {
      filters.status = req.query.status;
    }

    if (req.query.source && VALID_LEAD_SOURCES.has(req.query.source)) {
      filters.source = req.query.source;
    }

    if (req.query.assignedTo) {
      filters.assignedTo = req.query.assignedTo;
    }

    if (search) {
      const expression = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filters.$or = [
        { name: expression },
        { email: expression },
        { phone: expression },
        { country: expression },
        { interestedCourse: expression },
        { interestedIntake: expression },
      ];
    }

    const leads = await populateLeadQuery(Lead.find(filters).sort({ updatedAt: -1, createdAt: -1 }));

    return res.status(200).json({
      success: true,
      data: leads,
      message: "Leads retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getLeadById = async (req, res, next) => {
  try {
    const lead = await populateLeadQuery(Lead.findById(req.params.id));

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: lead,
      message: "Lead retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const createLead = async (req, res, next) => {
  try {
    const {
      name,
      email = "",
      phone,
      address = "",
      country = "",
      interestedCourse = "",
      interestedIntake = "",
      source = "walk_in",
      status = "new",
      assignedTo,
      followUpDate,
      nextAction = "",
      initialNote = "",
    } = req.body;

    const normalizedName = normalizeString(name);
    const normalizedPhone = normalizeString(phone);
    const normalizedEmail = normalizeEmail(email);
    const normalizedAddress = normalizeString(address);
    const normalizedCountry = normalizeString(country);
    const normalizedCourse = normalizeString(interestedCourse);
    const normalizedIntake = normalizeString(interestedIntake);
    const normalizedNextAction = normalizeString(nextAction);
    const normalizedInitialNote = normalizeString(initialNote);

    if (!normalizedName || !normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Lead name and phone are required",
      });
    }

    if (!VALID_LEAD_SOURCES.has(source)) {
      return res.status(400).json({
        success: false,
        message: "Lead source is invalid",
      });
    }

    if (!VALID_LEAD_STATUSES.has(status)) {
      return res.status(400).json({
        success: false,
        message: "Lead status is invalid",
      });
    }

    const leadFollowUpDate = parseOptionalDate(followUpDate, "Follow-up date");

    const duplicateLead = await findDuplicateLead({
      email: normalizedEmail,
      phone: normalizedPhone,
    });

    if (duplicateLead) {
      return res.status(400).json({
        success: false,
        message: "An active lead with the same email or phone already exists",
      });
    }

    if (normalizedEmail) {
      const existingUser = await User.findOne({ email: normalizedEmail }).select("_id");

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already belongs to an existing user",
        });
      }
    }

    const assignedConsultancyId = assignedTo || req.user.id;
    const assignedConsultancy = await ensureConsultancyUser(assignedConsultancyId);

    if (!assignedConsultancy) {
      return res.status(404).json({
        success: false,
        message: "Assigned consultancy user not found",
      });
    }

    const lead = new Lead({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      address: normalizedAddress,
      country: normalizedCountry,
      interestedCourse: normalizedCourse,
      interestedIntake: normalizedIntake,
      source,
      status,
      assignedTo: assignedConsultancy._id,
      followUpDate: leadFollowUpDate,
      nextAction: normalizedNextAction,
      createdBy: req.user.id,
    });

    appendLeadActivity({
      lead,
      action: "lead_created",
      message: `Lead ${normalizedName} was added to the pipeline`,
      createdBy: req.user.id,
      metadata: {
        source,
        status,
      },
    });

    if (normalizedInitialNote) {
      lead.notes.push({
        body: normalizedInitialNote,
        createdBy: req.user.id,
        createdAt: new Date(),
      });

      appendLeadActivity({
        lead,
        action: "note_added",
        message: "Initial lead note added",
        createdBy: req.user.id,
      });
    }

    await lead.save();

    if (String(assignedConsultancy._id) !== String(req.user.id)) {
      await createNotification({
        userId: assignedConsultancy._id,
        type: "lead",
        title: "New lead assigned",
        message: `${normalizedName} was assigned to you`,
        link: "/consultancy/leads",
        metadata: { leadId: lead._id },
      });
    }

    await logAuditEvent({
      actor: req.user,
      actionType: "lead_created",
      entityType: "lead",
      entityId: lead._id,
      entityLabel: normalizedName,
      summary: `Created lead ${normalizedName}`,
      targetLeadId: lead._id,
      metadata: {
        source,
        status,
        assignedTo: assignedConsultancy._id,
        followUpDate: leadFollowUpDate,
      },
    });

    const populatedLead = await populateLeadQuery(Lead.findById(lead._id));

    return res.status(201).json({
      success: true,
      data: populatedLead,
      message: "Lead created successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const updateLead = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    const normalizedName = normalizeString(req.body.name ?? lead.name);
    const normalizedPhone = normalizeString(req.body.phone ?? lead.phone);
    const normalizedEmail = normalizeEmail(req.body.email ?? lead.email);
    const normalizedAddress = normalizeString(req.body.address ?? lead.address);
    const normalizedCountry = normalizeString(req.body.country ?? lead.country);
    const normalizedCourse = normalizeString(req.body.interestedCourse ?? lead.interestedCourse);
    const normalizedIntake = normalizeString(req.body.interestedIntake ?? lead.interestedIntake);
    const normalizedNextAction = normalizeString(req.body.nextAction ?? lead.nextAction);
    const nextStatus = req.body.status ?? lead.status;
    const nextSource = req.body.source ?? lead.source;

    if (!normalizedName || !normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Lead name and phone are required",
      });
    }

    if (!VALID_LEAD_STATUSES.has(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: "Lead status is invalid",
      });
    }

    if (!VALID_LEAD_SOURCES.has(nextSource)) {
      return res.status(400).json({
        success: false,
        message: "Lead source is invalid",
      });
    }

    const duplicateLead = await findDuplicateLead({
      email: normalizedEmail,
      phone: normalizedPhone,
      excludeLeadId: lead._id,
    });

    if (duplicateLead) {
      return res.status(400).json({
        success: false,
        message: "An active lead with the same email or phone already exists",
      });
    }

    if (normalizedEmail) {
      const existingUser = await User.findOne({ email: normalizedEmail }).select("_id");
      const convertedStudentId = String(lead.convertedStudentId || "");

      if (existingUser && String(existingUser._id) !== convertedStudentId) {
        return res.status(400).json({
          success: false,
          message: "Email already belongs to an existing user",
        });
      }
    }

    let nextAssignedTo = lead.assignedTo ? String(lead.assignedTo) : "";

    if (req.body.assignedTo !== undefined) {
      if (!req.body.assignedTo) {
        nextAssignedTo = "";
      } else {
        const assignedConsultancy = await ensureConsultancyUser(req.body.assignedTo);

        if (!assignedConsultancy) {
          return res.status(404).json({
            success: false,
            message: "Assigned consultancy user not found",
          });
        }

        nextAssignedTo = String(assignedConsultancy._id);
      }
    }

    const nextFollowUpDate =
      req.body.followUpDate !== undefined
        ? parseOptionalDate(req.body.followUpDate, "Follow-up date")
        : lead.followUpDate;
    const nextLastContactedAt =
      req.body.lastContactedAt !== undefined
        ? parseOptionalDate(req.body.lastContactedAt, "Last contacted date")
        : lead.lastContactedAt;

    const previousStatus = lead.status;
    const previousAssignedTo = lead.assignedTo ? String(lead.assignedTo) : "";
    const previousFollowUpDate = lead.followUpDate ? new Date(lead.followUpDate).toISOString() : "";
    const nextFollowUpDateValue = nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : "";

    lead.name = normalizedName;
    lead.email = normalizedEmail;
    lead.phone = normalizedPhone;
    lead.address = normalizedAddress;
    lead.country = normalizedCountry;
    lead.interestedCourse = normalizedCourse;
    lead.interestedIntake = normalizedIntake;
    lead.source = nextSource;
    lead.status = nextStatus;
    lead.assignedTo = nextAssignedTo || null;
    lead.followUpDate = nextFollowUpDate;
    lead.lastContactedAt = nextLastContactedAt;
    lead.nextAction = normalizedNextAction;

    if (previousStatus !== nextStatus) {
      appendLeadActivity({
        lead,
        action: "status_changed",
        message: `Lead status changed from ${previousStatus} to ${nextStatus}`,
        createdBy: req.user.id,
        metadata: {
          from: previousStatus,
          to: nextStatus,
        },
      });
    }

    if (previousAssignedTo !== nextAssignedTo) {
      appendLeadActivity({
        lead,
        action: "assignee_changed",
        message: "Lead assignee was updated",
        createdBy: req.user.id,
      });
    }

    if (previousFollowUpDate !== nextFollowUpDateValue) {
      appendLeadActivity({
        lead,
        action: "follow_up_updated",
        message: nextFollowUpDate
          ? "Follow-up date was updated"
          : "Follow-up date was cleared",
        createdBy: req.user.id,
      });
    }

    await lead.save();

    if (nextAssignedTo && nextAssignedTo !== previousAssignedTo && nextAssignedTo !== String(req.user.id)) {
      await createNotification({
        userId: nextAssignedTo,
        type: "lead",
        title: "Lead assignment updated",
        message: `${lead.name} was assigned to you`,
        link: "/consultancy/leads",
        metadata: { leadId: lead._id },
      });
    }

    await logAuditEvent({
      actor: req.user,
      actionType: "lead_updated",
      entityType: "lead",
      entityId: lead._id,
      entityLabel: lead.name,
      summary: `Updated lead ${lead.name}`,
      targetLeadId: lead._id,
      changes: {
        status:
          previousStatus !== nextStatus
            ? { from: previousStatus, to: nextStatus }
            : undefined,
        assignedTo:
          previousAssignedTo !== nextAssignedTo
            ? { from: previousAssignedTo || null, to: nextAssignedTo || null }
            : undefined,
        followUpDate:
          previousFollowUpDate !== nextFollowUpDateValue
            ? { from: previousFollowUpDate || null, to: nextFollowUpDateValue || null }
            : undefined,
      },
      metadata: {
        source: nextSource,
      },
    });

    const populatedLead = await populateLeadQuery(Lead.findById(lead._id));

    return res.status(200).json({
      success: true,
      data: populatedLead,
      message: "Lead updated successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const addLeadNote = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    const noteBody = normalizeString(req.body.note);

    if (!noteBody) {
      return res.status(400).json({
        success: false,
        message: "A note is required",
      });
    }

    lead.notes.push({
      body: noteBody,
      createdBy: req.user.id,
      createdAt: new Date(),
    });

    appendLeadActivity({
      lead,
      action: "note_added",
      message: "Internal note added",
      createdBy: req.user.id,
    });

    await lead.save();

    await logAuditEvent({
      actor: req.user,
      actionType: "lead_note_added",
      entityType: "lead",
      entityId: lead._id,
      entityLabel: lead.name,
      summary: `Added an internal note to lead ${lead.name}`,
      targetLeadId: lead._id,
      metadata: {
        noteLength: noteBody.length,
      },
    });

    const populatedLead = await populateLeadQuery(Lead.findById(lead._id));

    return res.status(201).json({
      success: true,
      data: populatedLead,
      message: "Lead note added successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const logLeadContact = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    const channel = normalizeString(req.body.channel || "call").toLowerCase();
    const message = normalizeString(req.body.message);

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Contact details are required",
      });
    }

    if (!VALID_CONTACT_CHANNELS.has(channel)) {
      return res.status(400).json({
        success: false,
        message: "Contact channel is invalid",
      });
    }

    if (req.body.status && !VALID_LEAD_STATUSES.has(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: "Lead status is invalid",
      });
    }

    const nextFollowUpDate = parseOptionalDate(req.body.nextFollowUpDate, "Next follow-up date");

    lead.lastContactedAt = new Date();

    if (req.body.nextFollowUpDate !== undefined) {
      lead.followUpDate = nextFollowUpDate;
    }

    if (req.body.status) {
      lead.status = req.body.status;
    }

    appendLeadActivity({
      lead,
      action: "contact_logged",
      message: `${channel.replace(/_/g, " ")} contact logged: ${message}`,
      createdBy: req.user.id,
      metadata: {
        channel,
        status: lead.status,
        nextFollowUpDate,
      },
    });

    await lead.save();

    await logAuditEvent({
      actor: req.user,
      actionType: "lead_contact_logged",
      entityType: "lead",
      entityId: lead._id,
      entityLabel: lead.name,
      summary: `Logged ${channel} follow-up for ${lead.name}`,
      targetLeadId: lead._id,
      metadata: {
        channel,
        status: lead.status,
        nextFollowUpDate,
      },
    });

    const populatedLead = await populateLeadQuery(Lead.findById(lead._id));

    return res.status(201).json({
      success: true,
      data: populatedLead,
      message: "Lead contact logged successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const convertLeadToStudent = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (lead.convertedStudentId || lead.status === "converted") {
      return res.status(400).json({
        success: false,
        message: "Lead has already been converted",
      });
    }

    const studentName = normalizeString(req.body.name || lead.name);
    const studentEmail = normalizeEmail(req.body.email || lead.email);
    const studentPhone = normalizeString(req.body.phone || lead.phone);
    const studentAddress = normalizeString(req.body.address || lead.address);
    const password = normalizeString(req.body.password);

    if (!studentName || !studentEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Student name, email, and password are required for conversion",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({ email: studentEmail }).select("_id");

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already belongs to an existing user",
      });
    }

    const student = await User.create({
      name: studentName,
      email: studentEmail,
      password,
      role: "student",
      phone: studentPhone,
      address: studentAddress,
    });

    lead.name = studentName;
    lead.email = studentEmail;
    lead.phone = studentPhone;
    lead.address = studentAddress;
    lead.status = "converted";
    lead.convertedStudentId = student._id;
    lead.convertedAt = new Date();

    appendLeadActivity({
      lead,
      action: "lead_converted",
      message: `Lead converted to student account ${studentEmail}`,
      createdBy: req.user.id,
      metadata: {
        studentId: student._id,
      },
    });

    await lead.save();

    await logAuditEvent({
      actor: req.user,
      actionType: "lead_converted",
      entityType: "lead",
      entityId: lead._id,
      entityLabel: lead.name,
      summary: `Converted lead ${lead.name} into student ${student.email}`,
      targetLeadId: lead._id,
      targetStudentId: student._id,
      metadata: {
        studentEmail,
      },
    });

    const populatedLead = await populateLeadQuery(Lead.findById(lead._id));

    return res.status(201).json({
      success: true,
      data: populatedLead,
      message: "Lead converted to student successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const bulkAssignLeads = async (req, res, next) => {
  try {
    const leadIds = Array.isArray(req.body.leadIds)
      ? req.body.leadIds.map((leadId) => String(leadId || "")).filter(Boolean)
      : [];
    const assignedTo = String(req.body.assignedTo || "");

    if (!leadIds.length || !assignedTo) {
      return res.status(400).json({
        success: false,
        message: "Lead IDs and assignee are required",
      });
    }

    const assignedConsultancy = await ensureConsultancyUser(assignedTo);

    if (!assignedConsultancy) {
      return res.status(404).json({
        success: false,
        message: "Assigned consultancy user not found",
      });
    }

    const leads = await Lead.find({ _id: { $in: leadIds } });

    if (!leads.length) {
      return res.status(404).json({
        success: false,
        message: "No leads found for the selected IDs",
      });
    }

    await Promise.all(
      leads.map(async (lead) => {
        const previousAssignedTo = lead.assignedTo ? String(lead.assignedTo) : "";

        lead.assignedTo = assignedConsultancy._id;
        appendLeadActivity({
          lead,
          action: "assignee_changed",
          message: `Lead assigned to ${assignedConsultancy.name}`,
          createdBy: req.user.id,
        });
        await lead.save();

        await logAuditEvent({
          actor: req.user,
          actionType: "lead_bulk_assigned",
          entityType: "lead",
          entityId: lead._id,
          entityLabel: lead.name,
          summary: `Bulk-assigned lead ${lead.name} to ${assignedConsultancy.name}`,
          targetLeadId: lead._id,
          changes: {
            assignedTo: {
              from: previousAssignedTo || null,
              to: String(assignedConsultancy._id),
            },
          },
        });

        if (String(assignedConsultancy._id) !== String(req.user.id)) {
          await createNotification({
            userId: assignedConsultancy._id,
            type: "lead",
            title: "Lead assignment updated",
            message: `${lead.name} was assigned to you`,
            link: "/consultancy/leads",
            metadata: { leadId: lead._id },
          });
        }
      })
    );

    const refreshedLeads = await populateLeadQuery(
      Lead.find({ _id: { $in: leadIds } }).sort({ updatedAt: -1 })
    );

    return res.status(200).json({
      success: true,
      data: refreshedLeads,
      message: `Assigned ${refreshedLeads.length} lead${refreshedLeads.length === 1 ? "" : "s"} successfully`,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  addLeadNote,
  bulkAssignLeads,
  convertLeadToStudent,
  createLead,
  getLeadById,
  getLeads,
  logLeadContact,
  updateLead,
};
