import { format, isValid } from "date-fns";

export const DATE_TIME_FORMAT = "MMM dd, yyyy 'at' hh:mm a";

export const formatDateTime = (value, fallback = "Not set") => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return isValid(parsed) ? format(parsed, DATE_TIME_FORMAT) : fallback;
};

export const formatDateOnly = (value, fallback = "Not set") => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return isValid(parsed) ? format(parsed, "MMM dd, yyyy") : fallback;
};

export const formatCalendarLabel = (value, fallback = "Not set") => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return isValid(parsed) ? format(parsed, "EEEE, MMM dd") : fallback;
};
