import { useEffect, useMemo, useState } from "react";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { toast } from "react-toastify";

import Modal from "../../components/Modal";
import StatusBadge from "../../components/StatusBadge";
import StatusTimeline from "../../components/StatusTimeline";
import useApi from "../../hooks/useApi";
import { getCountryFlag } from "../../utils/country";
import { formatDateTime } from "../../utils/date";

const MyVisa = () => {
  const { data: visas, loading, error } = useApi("/visa/my");
  const [selectedVisa, setSelectedVisa] = useState(null);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const enrichedVisas = useMemo(
    () =>
      visas.map((visa) => ({
        ...visa,
        latestNote:
          [...(visa.statusHistory || [])]
            .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0]?.note ||
          visa.note ||
          "No consultancy note available yet.",
      })),
    [visas]
  );

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
          Visa Tracker
        </p>
        <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
          My visa applications
        </h2>
      </div>

      <div className="grid gap-5">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
              <div className="mt-4 h-4 w-64 animate-pulse rounded bg-gray-100" />
            </div>
          ))
        ) : enrichedVisas.length ? (
          enrichedVisas.map((visa) => (
            <div key={visa._id} className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-4xl">{getCountryFlag(visa.country)}</p>
                  <h3 className="mt-3 font-heading text-2xl font-semibold text-gray-900">
                    {visa.country}
                  </h3>
                  <p className="mt-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                    {visa.visaType} Visa
                  </p>
                </div>
                <div className="flex flex-col gap-3 lg:items-end">
                  <StatusBadge status={visa.status} />
                  <p className="text-sm text-gray-500">{formatDateTime(visa.updatedAt)}</p>
                </div>
              </div>

              <div className="mt-5 rounded-3xl bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Latest note
                </p>
                <p className="mt-2 text-sm leading-7 text-gray-600">{visa.latestNote}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVisa(visa)}
                className="mt-5 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                View Full Timeline
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="inline-flex rounded-3xl bg-blue-50 p-4 text-blue-600">
              <HiOutlineClipboardDocumentList className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
              No visa applications yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Your consultancy team will add your visa application here once the process begins.
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedVisa)}
        onClose={() => setSelectedVisa(null)}
        title={selectedVisa ? `${selectedVisa.country} Visa Timeline` : "Visa Timeline"}
        size="lg"
      >
        {selectedVisa ? <StatusTimeline history={selectedVisa.statusHistory || []} /> : null}
      </Modal>
    </div>
  );
};

export default MyVisa;
