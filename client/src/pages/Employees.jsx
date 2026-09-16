import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CardSkeleton, TableSkeleton } from '../components/common/Skeleton';
import {
  Users,
  Search,
  UserPlus,
  Eye,
  List,
  LayoutGrid,
  AlertTriangle,
  Building,
  Briefcase,
  UserCheck,
  CreditCard,
  FileSignature,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

export default function Employees() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState('kanban'); // 'list' or 'kanban'
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting State
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [missingBankFilter, setMissingBankFilter] = useState(searchParams.get('filter') === 'missing_bank');
  const [sortBy, setSortBy] = useState('firstName');

  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    jobPosition: '',
    employeeType: 'Full-time',
    joiningDate: new Date().toISOString().substring(0, 10),
    accountNumber: '',
    bankName: '',
    ifscCode: '',
  });

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [search, selectedDept, selectedStatus, selectedType, missingBankFilter, sortBy]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedDept) params.append('department', selectedDept);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedType) params.append('employeeType', selectedType);
      if (sortBy) params.append('sortBy', sortBy);

      const res = await API.get(`/employees?${params.toString()}`);
      if (res.data.success) {
        let list = res.data.employees;
        if (missingBankFilter) {
          list = list.filter((e) => !e.bankDetails?.accountNumber);
        }
        setEmployees(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const deptRes = await API.get('/employees/departments');
      const posRes = await API.get('/employees/job-positions');
      if (deptRes.data.success) setDepartments(deptRes.data.departments);
      if (posRes.data.success) setJobPositions(posRes.data.jobPositions);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        bankDetails: {
          accountNumber: formData.accountNumber,
          bankName: formData.bankName,
          ifscCode: formData.ifscCode,
        },
      };
      const res = await API.post('/employees', payload);
      if (res.data.success) {
        addToast('Employee profile created successfully!', 'success');
        setShowModal(false);
        fetchEmployees();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create employee', 'error');
    }
  };

  const canCreate = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" /> Employee Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">Central HR record hub connecting contracts, attendance, time off, and payroll history.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'kanban' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" /> List
            </button>
          </div>

          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20"
            >
              <UserPlus className="w-4 h-4" /> Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name, ID, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
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
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Employment Types</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contractor">Contractor</option>
            <option value="Intern">Intern</option>
          </select>

          <button
            onClick={() => setMissingBankFilter(!missingBankFilter)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
              missingBankFilter
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Missing Bank Details
          </button>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="firstName">Sort: First Name</option>
            <option value="lastName">Sort: Last Name</option>
            <option value="employeeId">Sort: Employee ID</option>
            <option value="joiningDate">Sort: Joining Date</option>
          </select>
        </div>
      </div>

      {/* Main Content Loading State */}
      {loading ? (
        viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
        ) : (
          <TableSkeleton rows={5} cols={6} />
        )
      ) : employees.length === 0 ? (
        /* Empty State */
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Employees Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No employee records matched your search or filter parameters. Try clearing filters or creating a new employee.
          </p>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
            >
              Add New Employee
            </button>
          )}
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {employees.map((emp) => {
            const missingBank = !emp.bankDetails?.accountNumber;
            const hasContract = emp.contractStatus === 'ACTIVE';

            return (
              <div
                key={emp._id}
                className="bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all duration-200 group"
              >
                <div>
                  {/* Card Header & Avatar */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-md ring-2 ring-white/10">
                        {emp.firstName[0]}
                        {emp.lastName[0]}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition">
                          {emp.firstName} {emp.lastName}
                        </h3>
                        <span className="text-xs font-mono font-bold text-indigo-400">{emp.employeeId}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {emp.status}
                    </span>
                  </div>

                  {/* Warning Badge if Information Missing */}
                  {missingBank && (
                    <div className="mt-3 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Missing Bank Details</span>
                    </div>
                  )}

                  {/* Card Key Details */}
                  <div className="mt-4 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{emp.department?.name || 'Unassigned Dept'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{emp.jobPosition?.title || 'Staff Position'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Manager: {emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : 'Direct Report'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileSignature className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Contract: </span>
                      <span className={`font-semibold ${hasContract ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {hasContract ? 'Active Contract' : 'No Contract'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile 360 Action Button */}
                <div className="pt-3 border-t border-slate-800">
                  <Link
                    to={`/employees/${emp._id}`}
                    className="w-full py-2 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" /> Profile 360
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-4">Employee</th>
                  <th className="p-4">ID</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Job Position</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Banking Status</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {employees.map((emp) => {
                  const missingBank = !emp.bankDetails?.accountNumber;
                  return (
                    <tr key={emp._id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-semibold text-white flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                          {emp.firstName[0]}
                          {emp.lastName[0]}
                        </div>
                        <div>
                          <div>
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal">{emp.email}</div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs font-bold text-indigo-400">{emp.employeeId}</td>
                      <td className="p-4">{emp.department?.name || 'Unassigned'}</td>
                      <td className="p-4">{emp.jobPosition?.title || 'Staff'}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">
                          {emp.employeeType || 'Full-time'}
                        </span>
                      </td>
                      <td className="p-4">
                        {missingBank ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3" /> Missing Details
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1 w-max">
                            <CreditCard className="w-3 h-3" /> Complete
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.status === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          to={`/employees/${emp._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> Profile 360
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Create Employee Profile</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="EMP005"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="john.doe@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Job Position</label>
                  <select
                    value={formData.jobPosition}
                    onChange={(e) => setFormData({ ...formData, jobPosition: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="">Select Job Title</option>
                    {jobPositions.map((j) => (
                      <option key={j._id} value={j._id}>
                        {j.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Employee Type</label>
                  <select
                    value={formData.employeeType}
                    onChange={(e) => setFormData({ ...formData, employeeType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    onClick={(e) => e.target.showPicker?.()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white cursor-pointer"
                  />
                </div>
              </div>

              {/* Bank Details Section */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <p className="font-semibold text-slate-300">Bank Account Details (Required for Payroll validation)</p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                  <input
                    type="text"
                    placeholder="Bank Name"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                  <input
                    type="text"
                    placeholder="IFSC Code"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>
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
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
