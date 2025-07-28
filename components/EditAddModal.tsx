
import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { XMarkIcon } from './Icons';

interface EditAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => Promise<void>;
  mode: 'add' | 'edit';
  initialData: any | null;
  columns: string[];
  tableName: string;
  allUsers: User[];
}

// Columns to ignore in the form (system-generated)
const IGNORED_COLUMNS = ['id', 'inserted_at', 'updated_at', 'created_at'];
// Tables that have a `user_id` field and a relationship to `auth.users`
const tablesWithUsers = ['subscriptions', 'referral_usage', 'user_progress'];

// Options for dropdowns in the subscriptions table
const planOptions = ['bronze', 'silver'];
const statusOptions = ['active', 'trialing', 'past_due', 'canceled', 'unpaid'];

const EditAddModal: React.FC<EditAddModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mode,
  initialData,
  columns,
  tableName,
  allUsers,
}) => {
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  const formColumns = columns.filter(col => !IGNORED_COLUMNS.includes(col));

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        const editFormData = {};
        for (const col of formColumns) {
          const value = initialData[col];
          // For JSON fields, stringify the object for editing in a textarea
          if (tableName === 'referral_usage' && col === 'details' && typeof value === 'object' && value !== null) {
            editFormData[col] = JSON.stringify(value, null, 2);
          } else {
            editFormData[col] = value ?? '';
          }
        }
        setFormData(editFormData);
      } else { // Handles 'add' mode
        // Start with a blank slate based on columns
        const emptyData = Object.fromEntries(formColumns.map(col => [col, '']));
        // Merge any pre-filled data from `initialData` (e.g., user_id)
        const finalData = { ...emptyData, ...(initialData || {}) };

        // Provide a helpful starting template for the details JSON field
        if (tableName === 'referral_usage' && formColumns.includes('details') && !finalData.details) {
          finalData['details'] = '{\n  "source": "manual_entry"\n}';
        }
        setFormData(finalData);
      }
    }
  }, [isOpen, mode, initialData, columns, tableName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // Handle boolean values from checkboxes
    const isCheckbox = type === 'checkbox';
    if (isCheckbox) {
      const checkboxValue = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checkboxValue });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Create a clean copy of formData, excluding the 'users' object that might exist from initialData
    const { users, ...payload } = formData;
    await onSave(payload);
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
    >
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-slate-700">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="flex justify-between items-center">
                <h2 id="modal-title" className="text-xl font-bold capitalize">
                    {mode === 'add' ? 'Add New Row to' : 'Edit Row in'} {tableName.replace(/_/g, ' ')}
                </h2>
                <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition">
                    <XMarkIcon className="w-6 h-6"/>
                </button>
            </div>
          </div>

          <div className="px-6 py-4 border-y border-slate-700 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              {formColumns.map(col => {
                // Special handling for user_id to show a dropdown
                if (tablesWithUsers.includes(tableName) && col === 'user_id' && allUsers.length > 0) {
                  return (
                    <div key={col}>
                      <label htmlFor={col} className="block text-sm font-medium text-slate-300 mb-1">User</label>
                      <select
                        id={col}
                        name={col}
                        value={formData[col] || ''}
                        onChange={handleChange}
                        className="w-full bg-slate-700 text-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 transition duration-200"
                      >
                        <option value="" disabled>Select a user...</option>
                        {allUsers.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.email || user.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                // Special handling for the 'details' JSON field in the referral_usage table
                if (tableName === 'referral_usage' && col === 'details') {
                  return (
                    <div key={col}>
                      <label htmlFor={col} className="block text-sm font-medium text-slate-300 capitalize mb-1">
                        Details (JSON)
                      </label>
                      <textarea
                        id={col}
                        name={col}
                        value={formData[col] || ''}
                        onChange={handleChange}
                        rows={6}
                        className="w-full bg-slate-900 text-slate-200 placeholder-slate-500 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition duration-200"
                        placeholder='e.g., { "source": "campaign_x", "value": 50 }'
                      />
                    </div>
                  );
                }

                // Special handling for dropdowns in subscriptions table
                if (tableName === 'subscriptions') {
                  if (col === 'plan') {
                    return (
                      <div key={col}>
                        <label htmlFor={col} className="block text-sm font-medium text-slate-300 capitalize mb-1">Plan (Tier)</label>
                        <select
                          id={col}
                          name={col}
                          value={formData[col] || ''}
                          onChange={handleChange}
                          className="w-full bg-slate-700 text-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 transition duration-200"
                        >
                          <option value="" disabled>Select a plan...</option>
                          {planOptions.map(option => (
                            <option key={option} value={option}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                  if (col === 'status') {
                    return (
                      <div key={col}>
                        <label htmlFor={col} className="block text-sm font-medium text-slate-300 capitalize mb-1">Status</label>
                        <select
                          id={col}
                          name={col}
                          value={formData[col] || ''}
                          onChange={handleChange}
                          className="w-full bg-slate-700 text-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 transition duration-200"
                        >
                          <option value="" disabled>Select a status...</option>
                          {statusOptions.map(option => (
                            <option key={option} value={option}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                }
                
                // Generic input rendering
                const value = initialData ? initialData[col] : undefined;
                let inputType = 'text';
                if (typeof value === 'boolean') {
                    inputType = 'checkbox';
                } else if (typeof value === 'number') {
                    inputType = 'number';
                } else if (col.endsWith('_at') || col.endsWith('_date')) {
                    inputType = 'datetime-local';
                }
                
                return (
                    <div key={col}>
                        <label htmlFor={col} className="block text-sm font-medium text-slate-300 capitalize mb-1">
                            {col.replace(/_/g, ' ')}
                        </label>
                        {inputType === 'checkbox' ? (
                            <input
                                id={col}
                                name={col}
                                type="checkbox"
                                checked={formData[col] || false}
                                onChange={handleChange}
                                className="h-4 w-4 rounded bg-slate-600 border-slate-500 text-sky-500 focus:ring-sky-500"
                            />
                        ) : (
                             <input
                                id={col}
                                name={col}
                                type={inputType}
                                value={formData[col] ? (inputType === 'datetime-local' && formData[col] ? new Date(formData[col]).toISOString().slice(0,16) : formData[col]) : ''}
                                onChange={handleChange}
                                className="w-full bg-slate-700 text-slate-200 placeholder-slate-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 transition duration-200"
                            />
                        )}
                    </div>
                )
            })}
            </div>
          </div>
          
          <div className="p-6 flex justify-end gap-3 bg-slate-800/50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-md transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md transition disabled:bg-slate-500 disabled:cursor-wait"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAddModal;
