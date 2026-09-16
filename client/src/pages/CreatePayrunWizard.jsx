import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import { PlayCircle, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, Building2, Calendar, CheckSquare, Square } from 'lucide-react';

export default function CreatePayrunWizard() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [structures, setStructures] = useState([]);

  // Step 1 Form
  const [step1Data, setStep1Data] = useState({
    name: 'April 2026 Payrun',
    salaryStructure: '',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
  });

  // Step 2 Candidates List
  const [previewList, setPreviewList] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  useEffect(() => {
    fetchStructures();
  }, []);

  const fetchStructures = async () => {
    try {
      const res = await API.get('/payroll/structures');
      if (res.data.success) {
        setStructures(res.data.structures);
        if (res.data.structures.length > 0) {
          setStep1Data((prev) => ({ ...prev, salaryStructure: res.data.structures[0]._id }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // STEP 1 ACTION: CLICK CONTINUE (DOES NOT CREATE PAYRUN IN DB!)
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post('/payruns/preview', step1Data);
      if (res.data.success) {
        setPreviewList(res.data.previewList);
        // Select all valid employees by default
        const validIds = res.data.previewList.map((item) => item.employee._id);
        setSelectedEmployees(validIds);
        setStep(2);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to fetch preview candidate list', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Employee Selection in Step 2
  const handleToggleSelect = (empId) => {
    if (selectedEmployees.includes(empId)) {
      setSelectedEmployees(selectedEmployees.filter((id) => id !== empId));
    } else {
      setSelectedEmployees([...selectedEmployees, empId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === previewList.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(previewList.map((item) => item.employee._id));
    }
  };

  // STEP 2 ACTION: CLICK CREATE PAYRUN (SAVEST PAYRUN IN DB!)
  const handleStep2Submit = async () => {
    if (selectedEmployees.length === 0) {
      addToast('Please select at least one employee to include in this Payrun', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: step1Data.name,
        periodStart: step1Data.periodStart,
        periodEnd: step1Data.periodEnd,
        salaryStructure: step1Data.salaryStructure,
        employeeIds: selectedEmployees,
      };

      const res = await API.post('/payruns', payload);
      if (res.data.success) {
        addToast('Payrun created in DRAFT status successfully!', 'success');
        navigate(`/payruns/${res.data.payrun._id}`);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create Payrun', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <PlayCircle className="w-6 h-6 text-indigo-400" /> Payrun Creation Wizard
          </h1>
          <p className="text-sm text-slate-400 mt-1">Multi-step payroll initialization and candidate employee selection engine.</p>
        </div>

        {/* Wizard Progress Indicator */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 text-xs font-bold px-3.5 py-1.5 rounded-full border ${step === 1 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
            <span>1</span> Period & Structure
          </div>
          <div className="w-4 h-0.5 bg-slate-800"></div>
          <div className={`flex items-center gap-2 text-xs font-bold px-3.5 py-1.5 rounded-full border ${step === 2 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
            <span>2</span> Employee Selection
          </div>
        </div>
      </div>

      {/* STEP 1: PERIOD & STRUCTURE SELECTION */}
      {step === 1 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" /> Step 1: Select Payroll Period & Salary Structure
          </h2>

          <form onSubmit={handleStep1Submit} className="space-y-5 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Payrun Identifier / Title *</label>
              <input
                type="text"
                required
                value={step1Data.name}
                onChange={(e) => setStep1Data({ ...step1Data, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Payroll Period Start Date *</label>
                <input
                  type="date"
                  required
                  value={step1Data.periodStart}
                  onChange={(e) => setStep1Data({ ...step1Data, periodStart: e.target.value })}
                  onClick={(e) => e.target.showPicker?.()}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Payroll Period End Date *</label>
                <input
                  type="date"
                  required
                  value={step1Data.periodEnd}
                  onChange={(e) => setStep1Data({ ...step1Data, periodEnd: e.target.value })}
                  onClick={(e) => e.target.showPicker?.()}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Select Salary Structure *</label>
              <select
                required
                value={step1Data.salaryStructure}
                onChange={(e) => setStep1Data({ ...step1Data, salaryStructure: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-indigo-500"
              >
                {structures.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Continue to Employee Selection <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: EMPLOYEE CANDIDATES SELECTION */}
      {step === 2 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-white">Step 2: Select Employees to Include in Payrun</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Period: {step1Data.periodStart} to {step1Data.periodEnd} • Candidate Employees: {previewList.length}
              </p>
            </div>
            <button
              onClick={handleSelectAll}
              className="text-xs text-indigo-400 font-semibold hover:underline flex items-center gap-1"
            >
              {selectedEmployees.length === previewList.length ? 'Deselect All' : 'Select All Eligible'}
            </button>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 font-semibold uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3 w-10">Select</th>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Joining Date</th>
                  <th className="p-3">Worked Hours</th>
                  <th className="p-3">Applicable Contract</th>
                  <th className="p-3">Base Wage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {previewList.map((item) => {
                  const isSelected = selectedEmployees.includes(item.employee._id);
                  return (
                    <tr
                      key={item.employee._id}
                      onClick={() => handleToggleSelect(item.employee._id)}
                      className={`cursor-pointer transition ${isSelected ? 'bg-indigo-950/30' : 'hover:bg-slate-800/40'}`}
                    >
                      <td className="p-3">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </td>
                      <td className="p-3 font-semibold text-white">
                        {item.employee.firstName} {item.employee.lastName}{' '}
                        <span className="font-mono text-indigo-400">({item.employee.employeeId})</span>
                      </td>
                      <td className="p-3">{new Date(item.startDate).toLocaleDateString('en-IN')}</td>
                      <td className="p-3 font-bold text-white font-mono">{item.workingHours} hrs</td>
                      <td className="p-3">
                        {item.applicableContract ? (
                          <span className="font-semibold text-emerald-400">{item.applicableContract.contractName}</span>
                        ) : (
                          <span className="font-semibold text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> {item.issueMessage}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-indigo-400">₹{item.wage.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Step 1
            </button>
            <button
              onClick={handleStep2Submit}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-600/30 flex items-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  CREATE PAYRUN ({selectedEmployees.length} EMPLOYEES) <PlayCircle className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
