
import React from "react";
import { Mail, Phone, UserRound } from "lucide-react";

const ClientCard = ({ client, onView }) => {
  if (!client) return null;

  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6 hover:shadow-md transition">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700">
          <UserRound size={24} />
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-800">
            {client.name}
          </h3>
          <p className="text-sm text-gray-500">Client</p>
        </div>
      </div>

      <div className="space-y-3 text-sm text-gray-600 mb-5">
        <p className="flex items-center gap-2">
          <Mail size={16} />
          {client.email || "No email available"}
        </p>

        <p className="flex items-center gap-2">
          <Phone size={16} />
          {client.phone || "No phone available"}
        </p>
      </div>

      <button
        onClick={() => onView?.(client)}
        className="w-full bg-purple-700 text-white py-2.5 rounded-xl hover:bg-purple-800 transition"
      >
        View Profile
      </button>
    </div>
  );
};

export default ClientCard;
