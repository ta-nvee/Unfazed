
import React, { useState } from "react";
import { CreditCard, IndianRupee } from "lucide-react";

const CheckoutForm = ({ amount = 0, onSubmit, loading = false }) => {
  const [paymentMethod, setPaymentMethod] = useState("razorpay");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (onSubmit) {
      onSubmit({ amount, paymentMethod });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100"
    >
      <h2 className="text-xl font-bold text-purple-800 mb-5">
        Complete Your Payment
      </h2>

      <div className="bg-purple-50 rounded-xl p-4 mb-6">
        <p className="text-gray-500 text-sm">Total Amount</p>
        <p className="text-2xl font-bold text-purple-800 flex items-center gap-1">
          <IndianRupee size={22} />
          {amount}
        </p>
      </div>

      <label className="block font-medium text-gray-700 mb-3">
        Payment Method
      </label>

      <label className="flex items-center gap-3 border border-purple-200 p-4 rounded-xl cursor-pointer mb-5">
        <input
          type="radio"
          value="razorpay"
          checked={paymentMethod === "razorpay"}
          onChange={(e) => setPaymentMethod(e.target.value)}
        />
        <CreditCard size={20} className="text-purple-700" />
        <span>Razorpay (UPI, Cards, Net Banking)</span>
      </label>

      <button
        type="submit"
        disabled={loading || amount <= 0}
        className="w-full bg-purple-700 text-white py-3 rounded-xl hover:bg-purple-800 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Proceed to Payment"}
      </button>

      <p className="text-xs text-gray-400 text-center mt-4">
        Secure payment processing.
      </p>
    </form>
  );
};

export default CheckoutForm;
