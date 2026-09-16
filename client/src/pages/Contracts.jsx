import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import { FileSignature, Plus, Search, AlertOctagon, CheckCircle2, DollarSign, Calendar } from 'lucide-react';

export default function Contracts() {
  const { addToast } = useToast();
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [conflictError, setConflictError] = useState(null);

  const [formData, setFormData] = useState({
    employee: '',
    contractName: '',
    startDate: new Date().toISOString().substring(0, 10),
    endDate: '',
    wage: 35000,
    salaryStructure: '',
    workingSchedule: '',
    status: 'RUNNING',
    notes: '',
  });

  useEffect(() => {
    fetchContracts();
    fetchMeta();
  }, []);

  const fetchContracts = async () => {
    try {
      const res = await API.get('/contracts');
      if (res.data.success) {
        setContracts(res.data.contracts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [empRes, structRes, schedRes] = await Promise.all([
        API.get('/employees'),
        API.get('/payroll/structures'),
        API.get('/working-schedules'),
      ]);
      if (empRes.data.success) setEmployees(empRes.data.employees);
      if (structRes.data.success) {
        setStructures(structRes.data.structures);
        if (structRes.data.structures.length > 0) {
          setFormData((prev) => ({ ...prev, salaryStructure: structRes.data.structures[0]._id }));
        }
      }
      if (schedRes.data?.success) {
        setSchedules(schedRes.data.schedules);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setConflictError(null);
    try {
      const payload = { ...formData };
      if (!payload.workingSchedule) delete payload.workingSchedule;
      if (!payload.endDate) delete payload.endDate;

      const res = await API.post('/contracts', payload);
      if (res.data.success) {
        addToast('New employment contract created successfully!', 'success');
        setShowModal(false);
        fetchContracts();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create contract';
      addToast(msg, 'error');
      if (err.response?.data?.conflictingContract) {
        setConflictError(err.response.data.conflictingContract);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-indigo-400" /> Contract Management Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">Configure historical and running employee employment contracts with overlap protection.</p>
        </div>
        <button
          onClick={() => {
            setConflictError(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" /> Create New Contract
        </button>
      </div>

      {/* Contracts Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4">Contract Name</th>
                <th className="p-4">Employee</th>
                <th className="p-4">Start Date</th>
                <th className="p-4">End Date</th>
                <th className="p-4">Configured Wage</th>
                <th className="p-4">Salary Structure</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {contracts.map((contract) => (
                <tr key={contract._id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 font-bold text-white">{contract.contractName}</td>
                  <td className="p-4">
                    {contract.employee?.firstName} {contract.employee?.lastName}{' '}
                    <span className="text-xs font-mono text-indigo-400">({contract.employee?.employeeId})</span>
                  </td>
                  <td className="p-4">{new Date(contract.startDate).toLocaleDateString('en-IN')}</td>
                  <td className="p-4">{contract.endDate ? new Date(contract.endDate).toLocaleDateString('en-IN') : 'Ongoing'}</td>
                  <td className="p-4 font-mono font-bold text-indigo-400 text-base">₹{contract.wage?.toLocaleString('en-IN')}</td>
                  <td className="p-4">{contract.salaryStructure?.name || 'Default Structure'}</td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                        contract.status === 'RUNNING'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : contract.status === 'EXPIRED'
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {contract.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Contract Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Issue Employment Contract</h3>

            {/* Overlap Error Callout */}
            {conflictError && (
              <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                  <AlertOctagon className="w-5 h-5" /> CRITICAL BUSINESS RULE VIOLATION
                </div>
                <p>An employee cannot have two RUNNING contracts overlapping for the same period!</p>
                <p className="font-mono bg-slate-950/80 p-2 rounded border border-rose-950 mt-1">
                  Conflicting Active Contract: '{conflictError.contractName}' (Starts: {new Date(conflictError.startDate).toLocaleDateString()})
                </p>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Select Employee *</label>
                <select
                  required
                  value={formData.employee}
                  onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="">Choose Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Contract Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Developer Contract Q2"
                  value={formData.contractName}
                  onChange={(e) => setFormData({ ...formData, contractName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    onClick={(e) => e.target.showPicker?.()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    onClick={(e) => e.target.showPicker?.()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Monthly Base Wage (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.wage}
                    onChange={(e) => setFormData({ ...formData, wage: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Contract Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="RUNNING">RUNNING (Active)</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="DRAFT">DRAFT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Salary Structure *</label>
                <select
                  required
                  value={formData.salaryStructure}
                  onChange={(e) => setFormData({ ...formData, salaryStructure: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="">Select Salary Structure</option>
                  {structures.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Working Schedule (Optional)</label>
                <select
                  value={formData.workingSchedule}
                  onChange={(e) => setFormData({ ...formData, workingSchedule: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="">Default (Inherit from Employee profile)</option>
                  {schedules.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.weeklyHours} hrs/week)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold">
                  Save Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
