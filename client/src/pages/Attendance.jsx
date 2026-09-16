import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CardSkeleton, TableSkeleton } from '../components/common/Skeleton';
import {
  Clock,
  Play,
  Square,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  Edit,
  History,
  UserCheck,
  Building,
} from 'lucide-react';

export default function Attendance() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  const [attendance, setAttendance] = useState([]);
  const [issues, setIssues] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [status, setStatus] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'issues'

  // Filters State
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') === 'missing_checkout' ? 'Missing Check-out' : '');
  const [selectedDate, setSelectedDate] = useState('');
  const [search, setSearch] = useState('');

  // Correction Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({
    newCheckIn: '',
    newCheckOut: '',
    correctionReason: '',
  });

  const canEdit = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'PAYROLL_USER'].includes(user?.role);
  const hasEmployeeProfile = Boolean(user?.employee);

  useEffect(() => {
    fetchAttendance();
    fetchStatus();
    fetchIssues();
    fetchDepartments();
  }, [selectedDept, selectedStatus, selectedDate, search]);

  useEffect(() => {
    let timer;
    if (status?.isWorking && status?.activeSession?.checkIn) {
      timer = setInterval(() => {
        const start = new Date(status.activeSession.checkIn).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, now - start);

        const hrs = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
        const mins = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
        const secs = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');

        setElapsedTime(`${hrs}:${mins}:${secs}`);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDept) params.append('department', selectedDept);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedDate) params.append('date', selectedDate);
      if (search) params.append('search', search);

      const res = await API.get(`/attendance?${params.toString()}`);
      if (res.data.success) setAttendance(res.data.attendance || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await API.get('/employees/departments');
      if (res.data.success) setDepartments(res.data.departments || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStatus = async () => {
    if (!hasEmployeeProfile) return;
    try {
      const res = await API.get('/attendance/status');
      if (res.data.success) setStatus(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchIssues = async () => {
    try {
      const res = await API.get('/attendance/issues');
      if (res.data.success) setIssues(res.data.issues || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckIn = async () => {
    try {
      await API.post('/attendance/check-in');
      addToast('Checked in successfully!', 'success');
      await fetchStatus();
      await fetchAttendance();
    } catch (err) {
      addToast(err.response?.data?.message || 'Check-in failed', 'error');
    }
  };

  const handleCheckOut = async () => {
    try {
      await API.post('/attendance/check-out');
      addToast('Checked out successfully!', 'success');
      await fetchStatus();
      await fetchAttendance();
      await fetchIssues();
    } catch (err) {
      addToast(err.response?.data?.message || 'Check-out failed', 'error');
    }
  };

  const openCorrectionModal = (att) => {
    const checkInLocal = att.checkIn ? new Date(att.checkIn).toISOString().slice(0, 16) : '';
    const checkOutLocal = att.checkOut ? new Date(att.checkOut).toISOString().slice(0, 16) : '';

    setEditingItem(att);
    setCorrectionForm({
      newCheckIn: checkInLocal,
      newCheckOut: checkOutLocal,
      correctionReason: '',
    });
  };

  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    if (!correctionForm.correctionReason.trim()) {
      addToast('Correction reason is mandatory', 'error');
      return;
    }

    try {
      const res = await API.put(`/attendance/${editingItem._id}/correct`, correctionForm);
      if (res.data.success) {
        addToast('Attendance corrected successfully with audit trail!', 'success');
        setEditingItem(null);
        fetchAttendance();
        fetchIssues();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to correct attendance', 'error');
    }
  };

  const getStatusBadge = (att) => {
    if (att.isManuallyEdited) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
          Manually Edited
        </span>
      );
    }

    switch (att.status) {
      case 'Present':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Present
          </span>
        );
      case 'Late':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Late
          </span>
        );
      case 'Absent':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            Absent
          </span>
        );
      case 'Overtime':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Overtime
          </span>
        );
      case 'Missing Check-out':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
            Missing Check-out
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
            {att.status || 'Present'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Punch Card Widget */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-400" /> Attendance Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">Live punch clock, attendance auditing, and authorized corrections.</p>
        </div>

        {/* Punch Clock Widget (only for linked employee profiles) */}
        {hasEmployeeProfile && (
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-inner">
            {status?.isWorking ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Active Work Session</div>
                    <div className="text-xl font-mono font-bold text-white tracking-wider">{elapsedTime}</div>
                  </div>
                </div>
                <button
                  onClick={handleCheckOut}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold text-xs transition shadow-lg shadow-rose-600/30 flex items-center gap-2"
                >
                  <Square className="w-4 h-4 fill-white" /> CHECK OUT
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Punch Status</div>
                  <div className="text-xs font-bold text-slate-200">Not Clocked In</div>
                </div>
                <button
                  onClick={handleCheckIn}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs transition shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" /> CHECK IN
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search employee name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="Present">Present</option>
          <option value="Late">Late</option>
          <option value="Absent">Absent</option>
          <option value="Overtime">Overtime</option>
          <option value="Missing Check-out">Missing Check-out</option>
          <option value="Manually Edited">Manually Edited</option>
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          onClick={(e) => e.target.showPicker?.()}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
        />
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'all'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" /> Attendance Logs ({attendance.length})
        </button>

        <button
          onClick={() => setActiveTab('issues')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'issues'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertCircle className="w-4 h-4" /> Missing Check-out Detector ({issues.length})
        </button>
      </div>

      {/* TAB 1: ATTENDANCE LOGS TABLE */}
      {activeTab === 'all' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : attendance.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No attendance records found for selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4">Employee</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Check In</th>
                    <th className="p-4">Check Out</th>
                    <th className="p-4">Worked Hours</th>
                    <th className="p-4">Status</th>
                    {canEdit && <th className="p-4 text-right">Audit / Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {attendance.map((att) => (
                    <tr key={att._id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-semibold text-white">
                        {att.employee?.firstName} {att.employee?.lastName}{' '}
                        <span className="text-[11px] font-mono text-indigo-400">({att.employee?.employeeId})</span>
                      </td>
                      <td className="p-4 font-mono text-slate-300">{att.date}</td>
                      <td className="p-4 font-mono">{att.checkIn ? new Date(att.checkIn).toLocaleTimeString('en-IN') : '--:--'}</td>
                      <td className="p-4 font-mono">{att.checkOut ? new Date(att.checkOut).toLocaleTimeString('en-IN') : '--:--'}</td>
                      <td className="p-4 font-bold text-white font-mono">{att.workedHours} hrs</td>
                      <td className="p-4">{getStatusBadge(att)}</td>
                      {canEdit && (
                        <td className="p-4 text-right">
                          {att.isManuallyEdited ? (
                            <div className="text-[10px] text-slate-400 text-right">
                              <span className="font-semibold text-indigo-300 block">Edited by {att.editedBy?.email || 'HR'}</span>
                              <span className="text-slate-500 italic block">{att.correctionReason}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => openCorrectionModal(att)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 rounded-lg font-semibold transition"
                            >
                              <Edit className="w-3.5 h-3.5" /> Correct
                            </button>
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
      )}

      {/* TAB 2: ISSUES DETECTOR */}
      {activeTab === 'issues' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">Missing Check-out & Audit Issues</h3>
              <p className="text-xs text-slate-400">Records flagging incomplete punch cycles requiring manager correction prior to payroll validation.</p>
            </div>
          </div>

          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[11px] font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4">Employee</th>
                <th className="p-4">Date</th>
                <th className="p-4">Check In</th>
                <th className="p-4">Detected Issue</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {issues.map((iss) => (
                <tr key={iss._id}>
                  <td className="p-4 font-bold text-white">
                    {iss.employee?.firstName} {iss.employee?.lastName} ({iss.employee?.employeeId})
                  </td>
                  <td className="p-4 font-mono">{iss.date}</td>
                  <td className="p-4 font-mono">{new Date(iss.checkIn).toLocaleTimeString('en-IN')}</td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-bold">
                      {iss.issue}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {canEdit && (
                      <button
                        onClick={() => openCorrectionModal(iss)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition"
                      >
                        Correct Check-out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ATTENDANCE CORRECTION MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-400" /> Authorized Attendance Correction
              </h3>
              <span className="text-xs font-mono font-bold text-indigo-400">{editingItem.date}</span>
            </div>

            <form onSubmit={handleSubmitCorrection} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 space-y-1">
                <p className="font-semibold text-white">
                  Employee: {editingItem.employee?.firstName} {editingItem.employee?.lastName} ({editingItem.employee?.employeeId})
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                  <div>Original In: {editingItem.checkIn ? new Date(editingItem.checkIn).toLocaleTimeString('en-IN') : 'None'}</div>
                  <div>Original Out: {editingItem.checkOut ? new Date(editingItem.checkOut).toLocaleTimeString('en-IN') : 'None'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">New Check In Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={correctionForm.newCheckIn}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, newCheckIn: e.target.value })}
                    onClick={(e) => e.target.showPicker?.()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">New Check Out Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={correctionForm.newCheckOut}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, newCheckOut: e.target.value })}
                    onClick={(e) => e.target.showPicker?.()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Correction Reason (Mandatory Audit Log) *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this attendance entry is being manually corrected (e.g. Employee forgot to clock out)..."
                  value={correctionForm.correctionReason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, correctionReason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg">
                  Submit Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
