import { useEffect } from "react";
import { HiOutlineReceiptPercent } from "react-icons/hi2";
import { toast } from "react-toastify";

import StatusBadge from "../../components/StatusBadge";
import useApi from "../../hooks/useApi";
import { formatDateTime } from "../../utils/date";

const MyInvoices = () => {
  const { data: invoices, loading, error } = useApi("/invoices/my");

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
          Billing
        </p>
        <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">My invoices</h2>
      </div>

      <div className="grid gap-5">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="h-5 w-44 animate-pulse rounded bg-gray-200" />
            </div>
          ))
        ) : invoices.length ? (
          invoices.map((invoice) => (
            <div key={invoice._id} className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-heading text-2xl font-semibold text-gray-900">
                    {invoice.invoiceNumber}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Due {formatDateTime(invoice.dueDate)}
                  </p>
                </div>
                <StatusBadge status={invoice.status} />
              </div>
              <div className="mt-4 grid gap-2 text-sm text-gray-500 md:grid-cols-3">
                <p>Total: {invoice.total.toFixed(2)}</p>
                <p>Paid: {invoice.amountPaid.toFixed(2)}</p>
                <p>Balance: {invoice.balanceDue.toFixed(2)}</p>
              </div>
              <div className="mt-5 space-y-2">
                {invoice.items.map((item, index) => (
                  <div key={`${invoice._id}-${index}`} className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">
                    {item.label} • {Number(item.amount).toFixed(2)}
                  </div>
                ))}
              </div>
              {invoice.payments?.length ? (
                <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="font-semibold">Payment history</p>
                  <div className="mt-3 space-y-2">
                    {invoice.payments.map((payment, index) => (
                      <p key={`${invoice._id}-payment-${index}`}>
                        {Number(payment.amount).toFixed(2)} via {payment.method} on{" "}
                        {formatDateTime(payment.paidAt)}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="inline-flex rounded-3xl bg-blue-50 p-4 text-blue-600">
              <HiOutlineReceiptPercent className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
              No invoices yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Your consultancy will publish invoices and payment updates here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyInvoices;
