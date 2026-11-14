
import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const RevenueChart = ({ data = [] }) => {
  const defaultData = [
    { month: "Jan", revenue: 12000 },
    { month: "Feb", revenue: 18000 },
    { month: "Mar", revenue: 15000 },
    { month: "Apr", revenue: 24000 },
    { month: "May", revenue: 20000 },
    { month: "Jun", revenue: 30000 },
  ];

  const chartData = data.length > 0 ? data : defaultData;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
      <h2 className="text-xl font-bold text-purple-800 mb-6">
        Revenue Overview
      </h2>

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="revenue" fill="#7c3aed" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;
