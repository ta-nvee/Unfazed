
import React from "react";
import { IndianRupee, Receipt } from "lucide-react";

const InvoiceView = ({ invoice }) => {
  if (!invoice) {
    return (
      <div className="p-6 text-center text-gray-500">
        No invoice available.
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-purple-100 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-purple-800">
            Unfazed
          </h2>
          <p className="text-gray-500 text-sm">Payment Invoice</p>
        </div>

        <Receipt size={36} className="text-purple-700" />
      </div>

      <div className="space-y-3 mb-8 text-gray-600">
        <p>
          <strong>Invoice ID:</strong> {invoice._id || invoice.id}
        </p>
        <p>
          <strong>Client:</strong> {invoice.clientName || "N/A"}
        </p>
        <p>
          <strong>Date:</strong>{" "}
          {invoice.date
            ? new Date(invoice.date).toLocaleDateString("en-IN")
            : "N/A"}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          <span className="text-green-600 font-semibold">
            {invoice.status || "Pending"}
          </span>
        </p>
      </div>

      <div className="border-t border-b border-purple-100 py-5 flex justify-between items-center">
        <span className="font-semibold text-gray-700">Total Amount</span>
        <span className="text-2xl font-bold text-purple-800 flex items-center">
          <IndianRupee size={20} />
          {invoice.amount || 0}
        </span>
      </div>

      <button
        onClick={() => window.print()}
        className="mt-6 w-full bg-purple-700 text-white py-3 rounded-xl hover:bg-purple-800"
      >
        Download / Print Invoice
      </button>
    </div>
  );
};

export default InvoiceView;
