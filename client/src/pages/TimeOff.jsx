import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/common/Skeleton';
import { CalendarDays, Plus, CheckCircle, XCircle, Clock, PieChart, UserCheck } from 'lucide-react';

export default function TimeOff() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [allocations, setAllocations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(user?.role === 'EMPLOYEE' ? user.employee?._id || '' : 'MY_PERSONAL');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const todayStr = new Date().toISOString().substring(0, 10);

  const [formData, setFormData] = useState({
    type: '',
    startDate: todayStr,
    endDate: todayStr,
    numberOfDays: 1,
    reason: '',
  });

  useEffect(() => {
    fetchTimeOffData();
  }, []);

  // Auto calculate number of days when start or end date changes
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
      setFormData((prev) => ({ ...prev, numberOfDays: diffDays }));
    }
  }, [formData.startDate, formData.endDate]);

  const fetchTimeOffData = async () => {
    setLoading(true);
    try {
      const allocRes = await API.get('/timeoff/allocations');
      const reqRes = await API.get('/timeoff/requests');
      const typeRes = await API.get('/timeoff/types');

      if (allocRes.data.success) setAllocations(allocRes.data.allocations || []);
      if (reqRes.data.success) setRequests(reqRes.data.requests || []);
      if (typeRes.data.success) {
        setTypes(typeRes.data.types || []);
        if (typeRes.data.types?.length > 0) {
          setFormData((prev) => ({ ...prev, type: typeRes.data.types[0]._id }));
        }
      }

      if (user?.role !== 'EMPLOYEE') {
        const empRes = await API.get('/employees');
        if (empRes.data.success) setEmployees(empRes.data.employees || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/timeoff/requests', formData);
      if (res.data.success) {
        addToast('Leave request submitted successfully!', 'success');
        setShowModal(false);
        fetchTimeOffData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to submit leave request', 'error');
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await API.put(`/timeoff/requests/${id}/approve`);
      if (res.data.success) {
        addToast('Leave request APPROVED! Allocation balance updated automatically.', 'success');
        fetchTimeOffData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Approval failed', 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await API.put(`/timeoff/requests/${id}/reject`);
      if (res.data.success) {
        addToast('Leave request REFUSED', 'info');
        fetchTimeOffData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Refusal failed', 'error');
    }
  };

  const canApprove = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'PAYROLL_USER'].includes(user?.role);

  // Filter allocations based on selected dropdown
  const filteredAllocations = allocations.filter((alloc) => {
    if (selectedEmployee === 'ALL') return true;
    if (selectedEmployee === 'MY_PERSONAL') {
      return alloc.employee?._id === user?.employee?._id || alloc.employee === user?.employee?._id;
    }
    return alloc.employee?._id === selectedEmployee || alloc.employee === selectedEmployee;
  });

  // Compute summary stats
  const pendingCount = requests.filter((r) => r.status === 'SUBMITTED' || r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const refusedCount = requests.filter((r) => r.status === 'REJECTED' || r.status === 'REFUSED').length;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-400" /> Time Off & Leave Allocations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time leave balance tracking and automated deduction upon approval.
          </p>
        </div>
        <button
          onClick={() => {
            setFormData((prev) => ({ ...prev, startDate: todayStr, endDate: todayStr, numberOfDays: 1 }));
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" /> Apply for Time Off
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Pending Requests</p>
            <h3 className="text-2xl font-black text-white mt-1">{pendingCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Approved Requests</p>
            <h3 className="text-2xl font-black text-white mt-1">{approvedCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Refused Requests</p>
            <h3 className="text-2xl font-black text-white mt-1">{refusedCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Leave Allocations Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-base font-bold text-white">
            {selectedEmployee === 'MY_PERSONAL'
              ? 'My Leave Allocations & Balances'
              : selectedEmployee === 'ALL'
              ? 'All Company Employee Allocations'
              : 'Selected Employee Balances'}
          </h3>

          {user?.role !== 'EMPLOYEE' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-semibold">Filter Employee:</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="MY_PERSONAL">My Personal Allocations</option>
                <option value="ALL">All Employees (Company-Wide)</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <TableSkeleton rows={2} cols={3} />
        ) : filteredAllocations.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
            No leave allocations found for the selected filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {filteredAllocations.map((alloc) => {
              const allocated = alloc.allocatedDays || 1;
              const used = alloc.usedDays || 0;
              const remaining = alloc.remainingDays ?? (allocated - used);
              const percentage = Math.min(100, Math.max(0, (used / allocated) * 100));

              return (
                <div key={alloc._id} className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-white text-sm block">{alloc.type?.name || 'Leave Type'}</span>
                      {selectedEmployee === 'ALL' && alloc.employee && (
                        <span className="text-[11px] font-semibold text-indigo-400 block mt-0.5">
                          {alloc.employee.firstName} {alloc.employee.lastName} ({alloc.employee.employeeId})
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        alloc.type?.isPaid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {alloc.type?.isPaid ? 'PAID LEAVE' : 'UNPAID LEAVE'}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-indigo-400 font-mono">{remaining}</span>
                    <span className="text-xs text-slate-400 font-semibold uppercase">Days Remaining</span>
                  </div>

                  {/* Visual Progress Indicator */}
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-xs text-slate-400 font-medium pt-1">
                    <span>Allocated: {allocated} days</span>
                    <span>Used: {used} days</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leave Requests Table */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white">Time Off Request Log & Approvals</h3>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No leave requests submitted yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4">Employee</th>
                    <th className="p-4">Leave Type</th>
                    <th className="p-4">Start Date</th>
                    <th className="p-4">End Date</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Approver</th>
                    <th className="p-4">Status</th>
                    {canApprove && <th className="p-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {requests.map((req) => (
                    <tr key={req._id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-semibold text-white">
                        {req.employee?.firstName} {req.employee?.lastName}{' '}
                        <span className="text-[11px] font-mono text-indigo-400">({req.employee?.employeeId})</span>
                      </td>
                      <td className="p-4 font-medium">{req.type?.name}</td>
                      <td className="p-4 font-mono">{new Date(req.startDate).toLocaleDateString('en-IN')}</td>
                      <td className="p-4 font-mono">{new Date(req.endDate).toLocaleDateString('en-IN')}</td>
                      <td className="p-4 font-bold text-white font-mono">{req.numberOfDays} Days</td>
                      <td className="p-4 text-slate-400">{req.approver ? `${req.approver.firstName || ''} ${req.approver.lastName || ''}`.trim() || req.approver.email : 'HR Manager'}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : req.status === 'REJECTED' || req.status === 'REFUSED'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      {canApprove && (
                        <td className="p-4 text-right">
                          {(req.status === 'SUBMITTED' || req.status === 'PENDING') && (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleApprove(req._id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(req._id)}
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition"
                              >
                                Refuse
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-400" /> Apply for Time Off
              </h3>
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full font-mono text-xs font-bold">
                {formData.numberOfDays} {formData.numberOfDays === 1 ? 'Day' : 'Days'}
              </span>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              {user?.role !== 'EMPLOYEE' && (
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Applying For Employee</label>
                  <select
                    value={formData.employee || user?.employee?._id || ''}
                    onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    {user?.employee && (
                      <option value={user.employee._id || user.employee}>
                        Myself ({user.employee.firstName || 'HR Manager'} {user.employee.lastName || ''})
                      </option>
                    )}
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Leave Type *</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  {types.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.isPaid ? 'Paid' : 'Unpaid'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    onClick={(e) => e.target.showPicker?.()}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-mono cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    onClick={(e) => e.target.showPicker?.()}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-mono cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Calculated Duration (Days) *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  min="0.5"
                  value={formData.numberOfDays}
                  onChange={(e) => setFormData({ ...formData, numberOfDays: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Reason for Leave</label>
                <textarea
                  rows="3"
                  placeholder="Provide reason for leave request..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
