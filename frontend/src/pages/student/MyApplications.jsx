import { useEffect } from "react";
import { HiOutlineRectangleStack } from "react-icons/hi2";
import { toast } from "react-toastify";

import StatusBadge from "../../components/StatusBadge";
import useApi from "../../hooks/useApi";
import { formatDateTime } from "../../utils/date";

const MyApplications = () => {
  const { data: applications, loading, error } = useApi("/universities/my");

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
          Admissions Tracker
        </p>
        <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
          My university applications
        </h2>
      </div>

      <div className="grid gap-5">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="h-5 w-44 animate-pulse rounded bg-gray-200" />
            </div>
          ))
        ) : applications.length ? (
          applications.map((item) => (
            <div key={item._id} className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                {item.country}
              </p>
              <h3 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
                {item.universityName}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {item.programName} • Intake {item.intake}
              </p>
              <div className="mt-4 grid gap-2 text-sm text-gray-500 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <span>Application:</span>
                  <StatusBadge status={item.applicationStatus} />
                </div>
                <div className="flex items-center gap-2">
                  <span>Offer Letter:</span>
                  <StatusBadge status={item.offerLetterStatus} />
                </div>
                <div className="flex items-center gap-2">
                  <span>Tuition Deposit:</span>
                  <StatusBadge status={item.tuitionDepositStatus} />
                </div>
                <div className="flex items-center gap-2">
                  <span>{item.enrollmentDocumentType}:</span>
                  <StatusBadge status={item.enrollmentDocumentStatus} />
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-500">{item.note || "No note available."}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-gray-400">
                Updated {formatDateTime(item.updatedAt)}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="inline-flex rounded-3xl bg-blue-50 p-4 text-blue-600">
              <HiOutlineRectangleStack className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
              No university application tracking yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Your consultancy will update your admission milestones here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyApplications;
