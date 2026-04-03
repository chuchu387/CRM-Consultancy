import { useCallback, useEffect, useMemo, useState } from "react";
import { isSameDay } from "date-fns";
import { HiOutlineCalendarDays, HiOutlineClipboardDocumentList, HiOutlineDocumentText } from "react-icons/hi2";
import { toast } from "react-toastify";

import api from "../../api/axios";
import StatusBadge from "../../components/StatusBadge";
import useCurrentDay from "../../hooks/useCurrentDay";
import { formatDateTime } from "../../utils/date";

const statCards = [
  {
    key: "applications",
    label: "My University Applications",
    icon: HiOutlineClipboardDocumentList,
  },
  { key: "documents", label: "Pending Docs", icon: HiOutlineDocumentText },
  { key: "upcoming", label: "Upcoming Meetings", icon: HiOutlineCalendarDays },
  { key: "completed", label: "Completed Meetings", icon: HiOutlineCalendarDays },
];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [visas, setVisas] = useState([]);
  const [applications, setApplications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const currentDay = useCurrentDay();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const [visaResponse, applicationResponse, documentResponse, meetingResponse] = await Promise.all([
        api.get("/visa/my"),
        api.get("/universities/my"),
        api.get("/documents/my"),
        api.get("/meetings/my"),
      ]);

      setVisas(visaResponse.data.data || []);
      setApplications(applicationResponse.data.data || []);
      setDocuments(documentResponse.data.data || []);
      setMeetings(meetingResponse.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const stats = useMemo(
    () => ({
      applications: applications.length,
      documents: documents.filter(
        (doc) =>
          doc.studentAcceptanceStatus !== "accepted" ||
          ["pending", "changes_requested", "rejected"].includes(doc.status)
      ).length,
      upcoming: meetings.filter((meeting) => !["completed", "rejected"].includes(meeting.status)).length,
      completed: meetings.filter((meeting) => meeting.status === "completed").length,
    }),
    [applications.length, documents, meetings]
  );

  const scheduledMeetings = useMemo(
    () =>
      [...meetings]
        .filter((meeting) => !["completed", "rejected"].includes(meeting.status))
        .sort(
          (a, b) =>
            new Date(a.confirmedDate || a.proposedDate || 0).getTime() -
            new Date(b.confirmedDate || b.proposedDate || 0).getTime()
        ),
    [meetings]
  );

  const todaysMeetings = useMemo(
    () =>
      scheduledMeetings.filter((meeting) =>
        isSameDay(new Date(meeting.confirmedDate || meeting.proposedDate), currentDay)
      ),
    [currentDay, scheduledMeetings]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon }) => (
          <div key={key} className="glass-panel p-5">
            {loading ? (
              <div className="space-y-4">
                <div className="h-10 w-10 animate-pulse rounded-2xl bg-gray-200" />
                <div className="h-8 w-24 animate-pulse rounded-xl bg-gray-200" />
                <div className="h-4 w-36 animate-pulse rounded-xl bg-gray-100" />
              </div>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-5 text-4xl font-semibold text-gray-900">{stats[key]}</p>
                <p className="mt-2 text-sm font-medium text-gray-500">{label}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
            My status
          </p>
          <h3 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
            My visa applications
          </h3>

          <div className="mt-6 grid gap-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                  <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
                  <div className="mt-3 h-4 w-28 animate-pulse rounded bg-gray-100" />
                </div>
              ))
            ) : visas.length ? (
              visas.map((visa) => (
                <div key={visa._id} className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-heading text-xl font-semibold text-gray-900">{visa.country}</p>
                      <p className="mt-1 text-sm text-gray-500">{visa.visaType} visa</p>
                    </div>
                    <StatusBadge status={visa.status} />
                  </div>
                  <p className="mt-4 text-sm text-gray-600">{visa.note || "No note available."}</p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
                No visa applications are visible yet.
              </div>
            )}
          </div>
        </section>

        <section className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
            Schedule
          </p>
          <h3 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
            Today&apos;s meetings
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            This updates automatically every day, so today&apos;s meetings roll over without a
            refresh.
          </p>

          <div className="mt-6 space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
                  <div className="mt-3 h-4 w-52 animate-pulse rounded bg-gray-100" />
                </div>
              ))
            ) : todaysMeetings.length ? (
              todaysMeetings.map((meeting) => (
                <div key={meeting._id} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{meeting.title}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {meeting.consultancyId?.name || "Consultancy"}
                      </p>
                    </div>
                    <StatusBadge status={meeting.status} />
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    {formatDateTime(meeting.confirmedDate || meeting.proposedDate)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
                No meetings are scheduled for today.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="glass-panel p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Schedule
            </p>
            <h3 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
              All scheduled meetings
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Every active meeting request and confirmed meeting in one place.
            </p>
          </div>
          <p className="text-sm font-medium text-gray-500">
            {scheduledMeetings.length} scheduled meeting
            {scheduledMeetings.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mt-6 grid gap-4 max-h-[32rem] overflow-y-auto pr-1">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
                <div className="mt-3 h-4 w-52 animate-pulse rounded bg-gray-100" />
              </div>
            ))
          ) : scheduledMeetings.length ? (
            scheduledMeetings.map((meeting) => (
              <div key={meeting._id} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{meeting.title}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {meeting.consultancyId?.name || "Consultancy"}
                    </p>
                  </div>
                  <StatusBadge status={meeting.status} />
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  {formatDateTime(meeting.confirmedDate || meeting.proposedDate)}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
              No scheduled meetings are active right now.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
