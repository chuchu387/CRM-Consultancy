const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const buildHtmlBody = (message) =>
  String(message || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 12px;">${line.replace(/[&<>"]/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
      };

      return entities[character] || character;
    })}</p>`)
    .join("");

const sendEmailWithResend = async ({ to, subject, message }) => {
  const apiKey = normalizeString(process.env.RESEND_API_KEY);
  const from = normalizeString(process.env.RESEND_FROM_EMAIL) || "CRM Nepal <onboarding@resend.dev>";
  const replyTo = normalizeString(process.env.RESEND_REPLY_TO);

  if (!apiKey) {
    throw new Error("Resend email delivery is not configured yet");
  }

  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject: normalizeString(subject) || "Reminder from CRM Nepal",
    text: String(message || ""),
    html: buildHtmlBody(message),
  };

  if (replyTo) {
    payload.reply_to = replyTo;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "crm-consultancy/1.0",
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();
  let parsedBody = {};

  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : {};
  } catch (_error) {
    parsedBody = {};
  }

  if (!response.ok) {
    throw new Error(
      parsedBody?.message ||
        parsedBody?.error?.message ||
        `Resend returned ${response.status}`
    );
  }

  return parsedBody;
};

module.exports = {
  sendEmailWithResend,
};
