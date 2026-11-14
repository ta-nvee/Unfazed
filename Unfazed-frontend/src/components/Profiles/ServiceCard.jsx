
import React from "react";
import { Clock, IndianRupee } from "lucide-react";

const ServiceCard = ({ title, description, duration, price, onBook }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 hover:shadow-lg transition">
      <h3 className="text-xl font-bold text-purple-800 mb-3">
        {title}
      </h3>

      <p className="text-gray-600 mb-5">
        {description}
      </p>

      <div className="flex justify-between items-center text-gray-600 mb-6">
        <span className="flex items-center gap-2">
          <Clock size={18} />
          {duration} min
        </span>

        <span className="flex items-center gap-1 font-semibold text-purple-700">
          <IndianRupee size={17} />
          {price}
        </span>
      </div>

      <button
        onClick={onBook}
        className="w-full bg-purple-700 text-white py-3 rounded-xl hover:bg-purple-800 transition"
      >
        Book Session
      </button>
    </div>
  );
};

export default ServiceCard;
