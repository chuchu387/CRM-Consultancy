import { formatDateTime } from "./date";

const pad = (value) => String(value).padStart(2, "0");

const toGoogleCalendarDate = (value) => {
  const date = new Date(value);
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours()
  )}${pad(date.getUTCMinutes())}00Z`;
};

const buildEventDateRange = (meeting) => {
  const startDate = new Date(meeting.confirmedDate || meeting.proposedDate);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  return {
    startDate,
    endDate,
  };
};

export const getGoogleCalendarLink = (meeting) => {
  const { startDate, endDate } = buildEventDateRange(meeting);
  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: meeting.title,
    dates: `${toGoogleCalendarDate(startDate)}/${toGoogleCalendarDate(endDate)}`,
    details: meeting.note || "Consultancy CRM meeting",
  });

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
};

export const downloadMeetingIcs = (meeting) => {
  const { startDate, endDate } = buildEventDateRange(meeting);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Consultancy CRM//EN",
    "BEGIN:VEVENT",
    `UID:${meeting._id}@consultancy-crm`,
    `DTSTAMP:${toGoogleCalendarDate(new Date())}`,
    `DTSTART:${toGoogleCalendarDate(startDate)}`,
    `DTEND:${toGoogleCalendarDate(endDate)}`,
    `SUMMARY:${meeting.title}`,
    `DESCRIPTION:${(meeting.note || "Consultancy CRM meeting").replace(/\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${meeting.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "meeting"}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const getReminderMailto = (meeting) => {
  const recipient = meeting.studentId?.email || "";
  const subject = encodeURIComponent(`Reminder: ${meeting.title}`);
  const body = encodeURIComponent(
    `Hello,\n\nThis is a reminder for ${meeting.title}.\n\nScheduled time: ${
      formatDateTime(meeting.confirmedDate || meeting.proposedDate)
    }\n\nNote: ${meeting.note || "Consultancy CRM meeting"}`
  );

  return `mailto:${recipient}?subject=${subject}&body=${body}`;
};

export const getWhatsAppReminderLink = (meeting) => {
  const phone = String(meeting.studentId?.phone || "").replace(/\D/g, "");
  const text = encodeURIComponent(
    `Reminder from Consultancy CRM\n\n${meeting.title}\nScheduled time: ${
      formatDateTime(meeting.confirmedDate || meeting.proposedDate)
    }\n\n${meeting.note || ""}`
  );

  return `https://wa.me/${phone}?text=${text}`;
};
