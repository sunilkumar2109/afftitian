import React from "react";
import NetworkForm from "@/components/admin/NetworkForm";

const AddNetworkPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <NetworkForm />
    </div>
  );
};

export default AddNetworkPage;
