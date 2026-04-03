import { useEffect, useMemo, useState } from "react";
import { HiOutlineUsers } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useApi from "../../hooks/useApi";
import { formatDateOnly } from "../../utils/date";
import { downloadCsv, downloadPdf } from "../../utils/export";

const Students = () => {
  const navigate = useNavigate();
  const { data: students, loading, error } = useApi("/users/students");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter((student) =>
      [student.name, student.email].some((value) => value?.toLowerCase().includes(query))
    );
  }, [search, students]);

  const {
    currentPage,
    endItem,
    paginatedItems: paginatedStudents,
    resetPage,
    rowsPerPage,
    setCurrentPage,
    setRowsPerPage,
    startItem,
    totalItems,
    totalPages,
  } = usePagination(filteredStudents);

  useEffect(() => {
    resetPage();
  }, [resetPage, search]);

  const handleExport = (type) => {
    if (!filteredStudents.length) {
      toast.info("No students to export");
      return;
    }

    const rows = filteredStudents.map((student) => ({
      Name: student.name,
      Email: student.email,
      Phone: student.phone || "",
      Address: student.address || "",
      Joined: formatDateOnly(student.createdAt),
    }));

    if (type === "csv") {
      downloadCsv("students", rows);
      return;
    }

    downloadPdf({
      filename: "students",
      title: "Students",
      columns: ["Name", "Email", "Phone", "Address", "Joined"],
      rows: rows.map((student) => [
        student.Name,
        student.Email,
        student.Phone,
        student.Address,
        student.Joined,
      ]),
    });
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Student Directory
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
              Registered students
            </h2>
          </div>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 lg:max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
        {!loading && filteredStudents.length ? (
          <Pagination
            currentPage={currentPage}
            endItem={endItem}
            itemLabel="students"
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
            rowsPerPage={rowsPerPage}
            startItem={startItem}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Email", "Phone", "Joined Date", "Actions"].map((header) => (
                  <th
                    key={header}
                    className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.24em] text-gray-500"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 5 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-5">
                        <div className="h-4 animate-pulse rounded bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredStudents.length ? (
                paginatedStudents.map((student) => (
                  <tr key={student._id} className="transition hover:bg-blue-50/50">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-blue-100 font-heading text-sm font-semibold text-blue-700">
                          {student.avatarUrl ? (
                            <img
                              src={student.avatarUrl}
                              alt={student.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            student.name?.charAt(0)?.toUpperCase() || "S"
                          )}
                        </div>
                        <p className="font-semibold text-gray-900">{student.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600">{student.email}</td>
                    <td className="px-6 py-5 text-sm text-gray-600">{student.phone || "—"}</td>
                    <td className="px-6 py-5 text-sm text-gray-600">
                      {formatDateOnly(student.createdAt)}
                    </td>
                    <td className="px-6 py-5">
                      <button
                        type="button"
                        onClick={() => navigate(`/consultancy/students/${student._id}`)}
                        className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="rounded-3xl bg-blue-50 p-4 text-blue-600">
                        <HiOutlineUsers className="h-8 w-8" />
                      </div>
                      <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
                        No students found
                      </h3>
                      <p className="mt-2 max-w-md text-sm text-gray-500">
                        Students will appear here after they register. Adjust your search if you
                        expected a different result.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default Students;
