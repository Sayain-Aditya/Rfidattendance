import Counter from "../models/Counter.js";

export const getNextEmployeeId = async () => {
  const counter = await Counter.findByIdAndUpdate(
    'employeeId',
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  
  return `MMS_${counter.sequence_value.toString().padStart(3, '0')}`;
};

export const peekNextEmployeeId = async () => {
  const counter = await Counter.findById('employeeId');
  const nextValue = counter ? counter.sequence_value + 1 : 1;
  
  return `MMS_${nextValue.toString().padStart(3, '0')}`;
};