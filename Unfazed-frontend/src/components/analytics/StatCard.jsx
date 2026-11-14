
import React from "react";
import { TrendingUp } from "lucide-react";

const StatCard = ({
  title,
  value,
  change,
  icon: Icon = TrendingUp,
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-500 font-medium">{title}</p>

        <div className="bg-purple-100 p-3 rounded-xl text-purple-700">
          <Icon size={22} />
        </div>
      </div>

      <h3 className="text-3xl font-bold text-purple-800">
        {value}
      </h3>

      {change && (
        <p className="text-sm text-green-600 mt-2">
          {change}
        </p>
      )}
    </div>
  );
};

export default StatCard;
