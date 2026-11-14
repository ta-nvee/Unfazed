
import React from "react";

const SlotPicker = ({
  slots = [],
  selectedSlot,
  onSlotSelect,
}) => {
  const defaultSlots = [
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
    "05:00 PM",
  ];

  const availableSlots = slots.length > 0 ? slots : defaultSlots;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
      <h2 className="text-xl font-bold text-purple-800 mb-2">
        Select Time Slot
      </h2>

      <p className="text-gray-500 mb-5">
        Choose your preferred appointment time.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {availableSlots.map((slot) => (
          <button
            key={slot}
            onClick={() => onSlotSelect?.(slot)}
            className={`py-3 px-4 rounded-xl border transition ${
              selectedSlot === slot
                ? "bg-purple-700 text-white border-purple-700"
                : "bg-purple-50 text-purple-800 border-purple-100 hover:bg-purple-100"
            }`}
          >
            {slot}
          </button>
        ))}
      </div>

      {selectedSlot && (
        <p className="mt-5 text-sm text-green-700">
          Selected appointment: {selectedSlot}
        </p>
      )}
    </div>
  );
};

export default SlotPicker;
