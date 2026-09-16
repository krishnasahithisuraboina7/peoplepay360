const Contract = require('../models/Contract');
const Employee = require('../models/Employee');

// @desc    Get all contracts
// @route   GET /api/contracts
// @access  Private (ADMIN, HR_MANAGER)
const getContracts = async (req, res, next) => {
  try {
    const { employee, status } = req.query;
    const query = {};

    if (employee) query.employee = employee;
    if (status) query.status = status;

    const contracts = await Contract.find(query)
      .populate('employee', 'firstName lastName employeeId email department')
      .populate('salaryStructure', 'name code')
      .populate('workingSchedule', 'name weeklyHours')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: contracts.length, contracts });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new contract with STRICT OVERLAP VALIDATION
// @route   POST /api/contracts
// @access  Private (ADMIN, HR_MANAGER)
const createContract = async (req, res, next) => {
  try {
    const { employee, contractName, startDate, endDate, wage, salaryStructure, workingSchedule, status, notes } = req.body;

    // Check employee exists
    const emp = await Employee.findById(employee);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // STRICT BUSINESS RULE: Overlapping RUNNING contract validation
    if (status === 'RUNNING' || !status) {
      const overlapCheck = await Contract.checkOverlap(employee, startDate, endDate);
      if (overlapCheck.hasOverlap) {
        return res.status(400).json({
          success: false,
          message: `CRITICAL BUSINESS RULE VIOLATION: Employee already has an active RUNNING contract '${overlapCheck.conflictingContract.contractName}' overlapping for this period!`,
          conflictingContract: overlapCheck.conflictingContract,
        });
      }
    }

    // Fallback to employee's assigned schedule if empty or not provided
    const resolvedSchedule =
      workingSchedule && workingSchedule.toString().trim() !== ''
        ? workingSchedule
        : (emp.workingSchedule || null);

    const contract = await Contract.create({
      employee,
      contractName,
      startDate,
      endDate: endDate || null,
      wage,
      salaryStructure,
      workingSchedule: resolvedSchedule,
      status: status || 'RUNNING',
      notes: notes || '',
    });

    const populated = await Contract.findById(contract._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('salaryStructure', 'name code')
      .populate('workingSchedule', 'name');

    res.status(201).json({ success: true, contract: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update contract
// @route   PUT /api/contracts/:id
// @access  Private (ADMIN, HR_MANAGER)
const updateContract = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.body;
    let contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    // Check overlap if changing dates or status to RUNNING
    const targetStatus = status || contract.status;
    const targetStart = startDate || contract.startDate;
    const targetEnd = endDate !== undefined ? endDate : contract.endDate;

    if (targetStatus === 'RUNNING') {
      const overlapCheck = await Contract.checkOverlap(contract.employee, targetStart, targetEnd, contract._id);
      if (overlapCheck.hasOverlap) {
        return res.status(400).json({
          success: false,
          message: `CRITICAL BUSINESS RULE VIOLATION: Cannot update to RUNNING status due to overlapping contract '${overlapCheck.conflictingContract.contractName}'`,
          conflictingContract: overlapCheck.conflictingContract,
        });
      }
    }

    if (req.body.workingSchedule === '') {
      req.body.workingSchedule = null;
    }

    contract = await Contract.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('employee', 'firstName lastName employeeId')
      .populate('salaryStructure', 'name code');

    res.json({ success: true, contract });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getContracts,
  createContract,
  updateContract,
};
