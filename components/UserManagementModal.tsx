import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { XMarkIcon, TrashIcon } from './Icons';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdateUser: (userId: string, metadata: object) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onDeleteUser,
}) => {
  const [metadata, setMetadata] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.user_metadata) {
      setMetadata(JSON.stringify(user.user_metadata, null, 2));
    } else {
      setMetadata('{}');
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let parsedMetadata;
    try {
      parsedMetadata = JSON.parse(metadata);
      if (typeof parsedMetadata !== 'object' || parsedMetadata === null) {
        throw new Error('Metadata must be a valid JSON object.');
      }
    } catch (err) {
      setError('Invalid JSON format. Please check your input.');
      return;
    }
    
    setIsSaving(true);
    await onUpdateUser(user.id, parsedMetadata);
    setIsSaving(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to permanently delete this user (${user.email})? This action cannot be undone.`)) {
        onDeleteUser(user.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
    >
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 border border-slate-700">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 id="modal-title" className="text-xl font-bold">
                Manage User
              </h2>
              <p className="text-slate-400 text-sm break-all">{user.email || 'No email'}</p>
              <p className="text-slate-500 text-xs font-mono mt-1">{user.id}</p>
            </div>
            <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition">
                <XMarkIcon className="w-6 h-6"/>
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-y border-slate-700 max-h-[60vh] overflow-y-auto">
          <form onSubmit={handleUpdate} className="space-y-4">
             <div>
                <label htmlFor="user_metadata" className="block text-sm font-medium text-slate-300 mb-1">
                    User Metadata (JSON)
                </label>
                <textarea
                    id="user_metadata"
                    name="user_metadata"
                    value={metadata}
                    onChange={(e) => setMetadata(e.target.value)}
                    rows={8}
                    className="w-full bg-slate-900 text-slate-200 placeholder-slate-400 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition duration-200"
                />
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
             </div>
             <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md transition disabled:bg-slate-500 disabled:cursor-wait"
                >
                    {isSaving ? 'Saving...' : 'Save Metadata'}
                </button>
             </div>
          </form>
          <div className="mt-6 pt-4 border-t border-slate-700">
            <h3 className="text-lg font-semibold text-red-500">Danger Zone</h3>
            <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-slate-400">Delete this user permanently.</p>
                <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition flex items-center gap-2"
                >
                    <TrashIcon className="w-4 h-4" />
                    Delete User
                </button>
            </div>
          </div>
        </div>
        
        <div className="p-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-md transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagementModal;
