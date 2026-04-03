import { useCallback, useEffect, useMemo, useState } from "react";
import { isSameDay } from "date-fns";
import { HiOutlineCalendarDays, HiOutlineClipboardDocumentList, HiOutlineUsers } from "react-icons/hi2";
import { toast } from "react-toastify";

import api from "../../api/axios";
import StatusBadge from "../../components/StatusBadge";
import useCurrentDay from "../../hooks/useCurrentDay";
import { formatDateTime } from "../../utils/date";

const statConfig = [
  { key: "students", label: "Total Students", icon: HiOutlineUsers },
  { key: "visas", label: "Active Visa Applications", icon: HiOutlineClipboardDocumentList },
  { key: "documents", label: "Pending Documents", icon: HiOutlineClipboardDocumentList },
  { key: "meetings", label: "Upcoming Meetings", icon: HiOutlineCalendarDays },
];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [visas, setVisas] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const currentDay = useCurrentDay();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const [studentsResponse, visaResponse, documentsResponse, meetingsResponse] =
        await Promise.all([
          api.get("/users/students"),
          api.get("/visa"),
          api.get("/documents"),
          api.get("/meetings"),
        ]);

      setStudents(studentsResponse.data.data || []);
      setVisas(visaResponse.data.data || []);
      setDocuments(documentsResponse.data.data || []);
      setMeetings(meetingsResponse.data.data || []);
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
      students: students.length,
      visas: visas.filter((visa) => !["Approved", "Rejected"].includes(visa.status)).length,
      documents: documents.filter((doc) =>
        ["pending", "uploaded", "changes_requested", "rejected"].includes(doc.status)
      ).length,
      meetings: meetings.filter((meeting) => {
        const meetingDate = new Date(meeting.confirmedDate || meeting.proposedDate);
        return (
          !Number.isNaN(meetingDate.getTime()) &&
          meetingDate >= new Date() &&
          !["completed", "rejected"].includes(meeting.status)
        );
      }).length,
    }),
    [documents, meetings, students.length, visas]
  );

  const recentActivity = useMemo(
    () =>
      visas
        .flatMap((visa) =>
          (visa.statusHistory || []).map((entry) => ({
            ...entry,
            studentName: visa.studentId?.name || "Student",
            country: visa.country,
            visaType: visa.visaType,
          }))
        )
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
        .slice(0, 5),
    [visas]
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
        {statConfig.map(({ key, label, icon: Icon }) => (
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
                Activity
              </p>
              <h3 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
                Recent visa updates
              </h3>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
                  <div className="mt-3 h-4 w-64 animate-pulse rounded bg-gray-100" />
                </div>
              ))
            ) : recentActivity.length ? (
              recentActivity.map((item, index) => (
                <div
                  key={`${item.status}-${item.updatedAt}-${index}`}
                  className="rounded-3xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-gray-900">{item.studentName}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {item.country} • {item.visaType}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    {item.note || "Status updated without an additional note."}
                  </p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.24em] text-gray-400">
                    {formatDateTime(item.updatedAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
                Status changes will appear here once visa workflows begin.
              </div>
            )}
          </div>
        </section>

        <section className="glass-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
            Today
          </p>
          <h3 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
            Meetings scheduled today
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Daily meeting view for {formatDateTime(currentDay, "today")}. Student names refresh
            automatically when the day changes.
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
                <div
                  key={meeting._id}
                  className="rounded-3xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{meeting.title}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {meeting.studentId?.name || "Student"}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {meeting.studentId?.email || "No email"}
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
              Upcoming and active meetings across all students.
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
                      {meeting.studentId?.name || "Student"}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {meeting.studentId?.email || "No email"}
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
