import { useEffect, useState } from "react";
import { format, formatDistanceToNowStrict, isPast, isValid } from "date-fns";
import { HiOutlineChatBubbleLeftRight, HiOutlineEnvelope } from "react-icons/hi2";

import StatusBadge from "./StatusBadge";
import { getReminderMailto, getWhatsAppReminderLink } from "../utils/calendar";
import { formatDateTime } from "../utils/date";

const getMeetingDate = (meeting) => meeting.confirmedDate || meeting.proposedDate;

const formatMeetingHeadline = (value) => {
  const parsed = new Date(value);
  return isValid(parsed) ? format(parsed, "EEEE, MMM dd, yyyy 'at' hh:mm a") : "Meeting time not set";
};

const getTimeRemainingLabel = (value) => {
  const parsed = new Date(value);

  if (!isValid(parsed)) {
    return "Time not available";
  }

  const distance = formatDistanceToNowStrict(parsed, { addSuffix: true });
  return isPast(parsed) ? `Scheduled ${distance}` : `Starts ${distance}`;
};

const getStudentMessage = (meeting) => {
  if (meeting.status === "accepted") {
    return "Your meeting is confirmed. Please be ready a few minutes before the scheduled time.";
  }

  if (meeting.status === "pending") {
    return "Your meeting request is pending. The consultancy will confirm or reschedule it soon.";
  }

  if (meeting.status === "rescheduled") {
    return "The consultancy proposed a new meeting time. Review the updated time below and accept it or send a new proposal.";
  }

  if (meeting.status === "completed") {
    return "This meeting has been marked as completed by the consultancy.";
  }

  if (meeting.status === "rejected") {
    return "This meeting request was declined. You can request another meeting whenever needed.";
  }

  return "Meeting details are available below.";
};

const MeetingCard = ({ meeting, role, onAction }) => {
  const [, setRefreshTick] = useState(0);
  const scheduledDate = getMeetingDate(meeting);
  const showReminderActions =
    role === "consultancy" &&
    (["accepted", "completed"].includes(meeting.status) || meeting.status === "rescheduled");

  useEffect(() => {
    const updateTick = () => setRefreshTick((value) => value + 1);
    const millisecondsUntilNextMinute = 60000 - (Date.now() % 60000);
    let intervalId;

    const timeoutId = window.setTimeout(() => {
      updateTick();
      intervalId = window.setInterval(updateTick, 60000);
    }, millisecondsUntilNextMinute);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return (
    <div className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
            Requested by {meeting.requestedBy}
          </p>
          <h3 className="mt-2 font-heading text-xl font-semibold text-gray-900">{meeting.title}</h3>
        </div>
        <StatusBadge status={meeting.status} />
      </div>

      <div className="mt-4 rounded-3xl border border-blue-100 bg-blue-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
          {meeting.status === "pending"
            ? "Requested meeting time"
            : meeting.status === "rescheduled"
              ? "Updated meeting time"
              : "Meeting time"}
        </p>
        <p className="mt-2 font-heading text-lg font-semibold text-gray-900">
          {formatMeetingHeadline(scheduledDate)}
        </p>
        <p className="mt-2 text-sm font-semibold text-blue-700">{getTimeRemainingLabel(scheduledDate)}</p>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
        <p>
          <span className="font-semibold text-gray-900">Proposed:</span>{" "}
          {formatDateTime(meeting.proposedDate)}
        </p>
        <p>
          <span className="font-semibold text-gray-900">Confirmed:</span>{" "}
          {formatDateTime(meeting.confirmedDate)}
        </p>
      </div>

      <p className="mt-4 text-sm text-gray-600">{meeting.note || "No meeting note provided."}</p>

      {role === "student" ? (
        <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">What this means</p>
          <p className="mt-1">{getStudentMessage(meeting)}</p>
        </div>
      ) : null}

      {meeting.status === "rescheduled" && meeting.rescheduledNote ? (
        <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-semibold">Reschedule note</p>
          <p className="mt-1">{meeting.rescheduledNote}</p>
        </div>
      ) : null}

      {showReminderActions ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {meeting.studentId?.email ? (
            <a
              href={getReminderMailto(meeting)}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <HiOutlineEnvelope className="h-4 w-4" />
              Email Reminder
            </a>
          ) : null}
          {meeting.studentId?.phone ? (
            <a
              href={getWhatsAppReminderLink(meeting)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <HiOutlineChatBubbleLeftRight className="h-4 w-4" />
              WhatsApp Reminder
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        {role === "consultancy" && meeting.status === "pending" ? (
          <>
            <button
              type="button"
              onClick={() => onAction?.("accepted", meeting)}
              className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => onAction?.("reschedule", meeting)}
              className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Reschedule
            </button>
            <button
              type="button"
              onClick={() => onAction?.("rejected", meeting)}
              className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Reject
            </button>
          </>
        ) : null}

        {role === "consultancy" && meeting.status === "accepted" ? (
          <>
            <button
              type="button"
              onClick={() => onAction?.("completed", meeting)}
              className="rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Mark Complete
            </button>
            <button
              type="button"
              onClick={() => onAction?.("reschedule", meeting)}
              className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              No Show / Reschedule
            </button>
          </>
        ) : null}

        {role === "consultancy" && meeting.status === "completed" ? (
          <button
            type="button"
            onClick={() => onAction?.("delete", meeting)}
            className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Delete
          </button>
        ) : null}

        {role === "student" && meeting.status === "accepted" ? (
          <p className="rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
            Confirmed for {formatDateTime(meeting.confirmedDate)}
          </p>
        ) : null}

        {role === "student" && meeting.status === "rescheduled" ? (
          <>
            <button
              type="button"
              onClick={() => onAction?.("accept-reschedule", meeting)}
              className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Accept Reschedule
            </button>
            <button
              type="button"
              onClick={() => onAction?.("repropose", meeting)}
              className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Propose New Date
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default MeetingCard;
