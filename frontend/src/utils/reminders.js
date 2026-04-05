import api from "../api/axios";

export const dispatchReminderBatch = async ({ channel, reminders }) => {
  const response = await api.post("/reminders/dispatch", {
    channel,
    reminders,
  });

  return response.data?.data || { dispatches: [], combinedDispatchUrl: "" };
};

export const launchReminderDispatch = ({ channel, dispatches = [], combinedDispatchUrl = "" }) => {
  if (combinedDispatchUrl) {
    window.location.href = combinedDispatchUrl;
    return;
  }

  if (dispatches.length === 1) {
    const [dispatch] = dispatches;

    if (channel === "email") {
      window.location.href = dispatch.url;
      return;
    }

    window.open(dispatch.url, "_blank", "noopener,noreferrer");
    return;
  }

  throw new Error(
    "Multiple reminders were prepared. Use bulk email with shared content or send WhatsApp reminders one at a time."
  );
};
