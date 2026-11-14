
import React from "react";

const ClientTable = ({ clients = [], onView, onDelete }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-purple-50 text-purple-800">
          <tr>
            <th className="p-4">Client Name</th>
            <th className="p-4">Email</th>
            <th className="p-4">Phone</th>
            <th className="p-4">Actions</th>
          </tr>
        </thead>

        <tbody>
          {clients.length > 0 ? (
            clients.map((client) => (
              <tr key={client._id || client.id} className="border-t">
                <td className="p-4 font-medium">{client.name}</td>
                <td className="p-4 text-gray-600">{client.email}</td>
                <td className="p-4 text-gray-600">
                  {client.phone || "N/A"}
                </td>
                <td className="p-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => onView?.(client)}
                      className="text-purple-700 hover:underline"
                    >
                      View
                    </button>

                    <button
                      onClick={() => onDelete?.(client._id || client.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="p-6 text-center text-gray-500">
                No clients found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ClientTable;
