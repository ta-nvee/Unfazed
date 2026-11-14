
import React, { useState } from "react";

const Calendar = ({ selectedDate, onDateSelect, availableDates = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDate = (day) => {
    const date = new Date(year, month, day);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const isAvailable = (day) => {
    if (availableDates.length === 0) return true;
    return availableDates.includes(formatDate(day));
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
      <div className="flex justify-between items-center mb-6">
        <button onClick={previousMonth} className="px-3 py-2 text-purple-700">
          ←
        </button>

        <h2 className="text-lg font-bold text-purple-800">
          {currentMonth.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h2>

        <button onClick={nextMonth} className="px-3 py-2 text-purple-700">
          →
        </button>
      </div>

      <div className="grid grid-cols-7 text-center gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="font-semibold text-gray-500 text-sm">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDay }).map((_, index) => (
          <div key={`empty-${index}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(
          (day) => {
            const date = new Date(year, month, day);
            const dateString = formatDate(day);
            const disabled = date < today || !isAvailable(day);
            const selected = selectedDate === dateString;

            return (
              <button
                key={day}
                disabled={disabled}
                onClick={() => onDateSelect?.(dateString)}
                className={`p-2 rounded-lg text-sm transition ${
                  selected
                    ? "bg-purple-700 text-white"
                    : disabled
                    ? "text-gray-300 cursor-not-allowed"
                    : "hover:bg-purple-100 text-gray-700"
                }`}
              >
                {day}
              </button>
            );
          }
        )}
      </div>
    </div>
  );
};

export default Calendar;
