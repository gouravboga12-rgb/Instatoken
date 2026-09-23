import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FolderLock } from 'lucide-react';
import { HealthRecordsVault } from '../../components/patient/HealthRecordsVault';

export const HealthRecords: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Top Breadcrumb & Page Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-150 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shadow-3xs"
            title="Go back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-heading">
                Medical Records &amp; Vault
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full">
                <ShieldCheck size={12} />
                256-Bit SSL
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Securely upload, manage, edit, download, and store your prescriptions &amp; lab reports
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-3xs">
          <FolderLock size={15} className="text-blue-600" />
          <span>Patient Account Vault</span>
        </div>
      </div>

      {/* Main Vault Content */}
      <div className="bg-white border border-slate-150 rounded-3xl p-4 sm:p-6 shadow-2xs">
        <HealthRecordsVault isModal={false} />
      </div>
    </div>
  );
};
