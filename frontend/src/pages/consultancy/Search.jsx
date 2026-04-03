import { useEffect, useMemo, useState } from "react";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { toast } from "react-toastify";

import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import StudentSummaryCard from "../../components/StudentSummaryCard";
import useApi from "../../hooks/useApi";
import usePagination from "../../hooks/usePagination";
import { formatDateTime } from "../../utils/date";
import { downloadCsv, downloadPdf } from "../../utils/export";

const tabs = ["students", "documents", "visas", "meetings"];

const Search = () => {
  const { data: students, error: studentsError } = useApi("/users/students");
  const { data: documents, error: documentsError } = useApi("/documents");
  const { data: visas, error: visasError } = useApi("/visa");
  const { data: meetings, error: meetingsError } = useApi("/meetings");
  const [activeTab, setActiveTab] = useState("students");
  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  useEffect(() => {
    [studentsError, documentsError, visasError, meetingsError].forEach((message) => {
      if (message) {
        toast.error(message);
      }
    });
  }, [documentsError, meetingsError, studentsError, visasError]);

  const filteredData = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matcher = (text) => text.toLowerCase().includes(normalizedQuery);

    if (activeTab === "students") {
      return students.filter((student) =>
        [student.name, student.email, student.phone || ""].some((value) =>
          matcher(String(value || ""))
        )
      );
    }

    if (activeTab === "documents") {
      return documents.filter((document) =>
        [
          document.studentId?.name || "",
          document.documentName,
          document.description || "",
          document.status,
        ].some((value) => matcher(String(value || "")))
      );
    }

    if (activeTab === "visas") {
      return visas.filter((visa) =>
        [visa.studentId?.name || "", visa.country, visa.visaType, visa.status].some((value) =>
          matcher(String(value || ""))
        )
      );
    }

    return meetings.filter((meeting) =>
      [meeting.studentId?.name || "", meeting.title, meeting.status, meeting.note || ""].some(
        (value) => matcher(String(value || ""))
      )
    );
  }, [activeTab, documents, meetings, query, students, visas]);

  const groupedResults = useMemo(() => {
    if (activeTab === "students") {
      return [];
    }

    const groups = filteredData.reduce((collection, item) => {
      const studentId = item.studentId?._id || item.studentId || "unknown";

      if (!collection[studentId]) {
        collection[studentId] = {
          studentId,
          studentName: item.studentId?.name || "Student",
          studentEmail: item.studentId?.email || "",
          items: [],
        };
      }

      collection[studentId].items.push(item);
      return collection;
    }, {});

    return Object.values(groups)
      .map((group) => {
        const sortedItems = [...group.items].sort((a, b) => {
          const aDate =
            a.uploadedAt || a.updatedAt || a.confirmedDate || a.proposedDate || a.createdAt || 0;
          const bDate =
            b.uploadedAt || b.updatedAt || b.confirmedDate || b.proposedDate || b.createdAt || 0;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });

        return {
          ...group,
          items: sortedItems,
          itemCount: sortedItems.length,
          latestUpdatedAt:
            sortedItems[0]?.uploadedAt ||
            sortedItems[0]?.updatedAt ||
            sortedItems[0]?.confirmedDate ||
            sortedItems[0]?.proposedDate ||
            sortedItems[0]?.createdAt ||
            null,
        };
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [activeTab, filteredData]);

  const displayData = activeTab === "students" ? filteredData : groupedResults;
  const selectedStudentGroup = useMemo(
    () => groupedResults.find((group) => group.studentId === selectedStudentId) || null,
    [groupedResults, selectedStudentId]
  );

  const {
    currentPage,
    endItem,
    paginatedItems,
    resetPage,
    rowsPerPage,
    setCurrentPage,
    setRowsPerPage,
    startItem,
    totalItems,
    totalPages,
  } = usePagination(displayData);

  useEffect(() => {
    resetPage();
  }, [activeTab, query, resetPage]);

  useEffect(() => {
    setSelectedStudentId("");
  }, [activeTab, query]);

  const handleExport = (type) => {
    if (!filteredData.length) {
      toast.info("No results to export");
      return;
    }

    const mapping = {
      students: {
        title: "Students Search Results",
        columns: ["Name", "Email", "Phone", "Joined"],
        rows: filteredData.map((student) => [
          student.name,
          student.email,
          student.phone || "",
          formatDateTime(student.createdAt),
        ]),
        csv: filteredData.map((student) => ({
          Name: student.name,
          Email: student.email,
          Phone: student.phone || "",
          Joined: formatDateTime(student.createdAt),
        })),
      },
      documents: {
        title: "Document Search Results",
        columns: ["Student", "Document", "Status", "Uploaded"],
        rows: filteredData.map((document) => [
          document.studentId?.name || "",
          document.documentName,
          document.status,
          formatDateTime(document.uploadedAt, "Not uploaded"),
        ]),
        csv: filteredData.map((document) => ({
          Student: document.studentId?.name || "",
          Document: document.documentName,
          Status: document.status,
          Uploaded: formatDateTime(document.uploadedAt, "Not uploaded"),
        })),
      },
      visas: {
        title: "Visa Search Results",
        columns: ["Student", "Country", "Visa Type", "Status"],
        rows: filteredData.map((visa) => [
          visa.studentId?.name || "",
          visa.country,
          visa.visaType,
          visa.status,
        ]),
        csv: filteredData.map((visa) => ({
          Student: visa.studentId?.name || "",
          Country: visa.country,
          VisaType: visa.visaType,
          Status: visa.status,
        })),
      },
      meetings: {
        title: "Meeting Search Results",
        columns: ["Student", "Title", "Status", "Date"],
        rows: filteredData.map((meeting) => [
          meeting.studentId?.name || "",
          meeting.title,
          meeting.status,
          formatDateTime(meeting.confirmedDate || meeting.proposedDate),
        ]),
        csv: filteredData.map((meeting) => ({
          Student: meeting.studentId?.name || "",
          Title: meeting.title,
          Status: meeting.status,
          Date: formatDateTime(meeting.confirmedDate || meeting.proposedDate),
        })),
      },
    };

    const selected = mapping[activeTab];

    if (type === "csv") {
      downloadCsv(`${activeTab}-search-results`, selected.csv);
      return;
    }

    downloadPdf({
      filename: `${activeTab}-search-results`,
      title: selected.title,
      columns: selected.columns,
      rows: selected.rows,
    });
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Global Search
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
              Search students, documents, visas, and meetings
            </h2>
          </div>

          <div className="relative">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === tab
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleExport("csv")}
                className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => handleExport("pdf")}
                className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-xl font-semibold text-gray-900">
            {displayData.length} result(s)
          </h3>
        </div>

        {displayData.length ? (
          <div className="mb-6 overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white">
            <Pagination
              currentPage={currentPage}
              endItem={endItem}
              itemLabel={activeTab === "students" ? "results" : "students"}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={setRowsPerPage}
              rowsPerPage={rowsPerPage}
              startItem={startItem}
              totalItems={totalItems}
              totalPages={totalPages}
            />
          </div>
        ) : null}

        <div className="space-y-3">
          {displayData.length ? (
            paginatedItems.map((item) => (
              activeTab === "students" ? (
                <div
                  key={item._id}
                  className="rounded-3xl border border-gray-100 bg-gray-50 p-4"
                >
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="mt-1 text-sm text-gray-600">{item.email}</p>
                </div>
              ) : (
                <StudentSummaryCard
                  key={item.studentId}
                  name={item.studentName}
                  email={item.studentEmail}
                  meta={`${item.itemCount} ${activeTab.slice(0, -1)} result${
                    item.itemCount === 1 ? "" : "s"
                  }`}
                  stats={[{ label: "Matches", value: item.itemCount, tone: "blue" }]}
                  updatedText={`Updated ${formatDateTime(item.latestUpdatedAt)}`}
                  onAction={() => setSelectedStudentId(item.studentId)}
                />
              )
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
              No results match your search yet.
            </div>
          )}
        </div>

      </div>

      <Modal
        isOpen={Boolean(selectedStudentGroup)}
        onClose={() => setSelectedStudentId("")}
        title="Student Search Results"
        size="lg"
      >
        {selectedStudentGroup ? (
          <div className="space-y-5">
            <div className="rounded-[1.75rem] border border-gray-100 bg-gray-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                Student
              </p>
              <h3 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
                {selectedStudentGroup.studentName}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedStudentGroup.studentEmail || "No email"}
              </p>
              <p className="mt-3 text-sm text-gray-600">
                {selectedStudentGroup.itemCount} matching {activeTab}
              </p>
            </div>

            <div className="grid gap-3">
              {selectedStudentGroup.items.map((item) => (
                <div
                  key={item._id}
                  className="rounded-[1.5rem] border border-gray-200 bg-white p-4 shadow-sm"
                >
                  {activeTab === "documents" ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">{item.documentName}</p>
                        <StatusBadge status={item.status} compact />
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {item.description || "No description"}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-gray-400">
                        Uploaded {formatDateTime(item.uploadedAt, "Not uploaded")}
                      </p>
                    </>
                  ) : null}
                  {activeTab === "visas" ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {item.country} • {item.visaType}
                        </p>
                        <StatusBadge status={item.status} compact />
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{item.note || "No note added."}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-gray-400">
                        Updated {formatDateTime(item.updatedAt)}
                      </p>
                    </>
                  ) : null}
                  {activeTab === "meetings" ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">{item.title}</p>
                        <StatusBadge status={item.status} compact />
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {formatDateTime(item.confirmedDate || item.proposedDate)}
                      </p>
                      <p className="mt-2 text-sm text-gray-500">{item.note || "No note added."}</p>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Search;
