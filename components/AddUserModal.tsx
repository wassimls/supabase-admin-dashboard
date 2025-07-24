
import React, { useState } from 'react';
import { XMarkIcon } from './Icons';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser: (userData: { email: string; password: string; metadata: object; }) => Promise<string | null>;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onCreateUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [metadata, setMetadata] = useState('{}');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
        setError('Email and password are required.');
        return;
    }

    let parsedMetadata;
    try {
      parsedMetadata = JSON.parse(metadata || '{}');
      if (typeof parsedMetadata !== 'object' || parsedMetadata === null || Array.isArray(parsedMetadata)) {
        throw new Error('Metadata must be a valid JSON object, not an array or other primitive.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid JSON format for metadata. Please provide a valid object, e.g., {"role": "editor"}.');
      return;
    }
    
    setIsSaving(true);
    const apiError = await onCreateUser({ email, password, metadata: parsedMetadata });
    setIsSaving(false);

    if (apiError) {
        // If the API call returned an error message, display it in the modal
        setError(apiError);
    }
    // On success, the parent component (App.tsx) will close the modal, so no "else" block is needed.
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
                <h2 id="modal-title" className="text-xl font-bold">
                    Create New User
                </h2>
                <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition">
                    <XMarkIcon className="w-6 h-6"/>
                </button>
            </div>
          </div>

          <div className="px-6 py-4 border-y border-slate-700 max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-700 text-slate-200 placeholder-slate-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 transition duration-200"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter a strong password"
                    className="w-full bg-slate-700 text-slate-200 placeholder-slate-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 transition duration-200"
                />
              </div>
              <div>
                <label htmlFor="user_metadata" className="block text-sm font-medium text-slate-300 mb-1">
                    User Metadata (JSON)
                </label>
                <textarea
                    id="user_metadata"
                    name="user_metadata"
                    value={metadata}
                    onChange={(e) => setMetadata(e.target.value)}
                    rows={6}
                    placeholder='e.g., { "plan": "pro", "is_active": true }'
                    className="w-full bg-slate-900 text-slate-200 placeholder-slate-500 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition duration-200"
                />
              </div>
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
              {isSaving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
