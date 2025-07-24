
import React, { useState, useEffect, useCallback } from 'react';
import { createClient, User } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from './services/supabase';
import { Database } from './types';
import { LogoIcon, LoadingSpinnerIcon, TableIcon, UsersIcon, PlusIcon, PencilIcon, TrashIcon, CogIcon } from './components/Icons';
import EditAddModal from './components/EditAddModal';
import UserManagementModal from './components/UserManagementModal';
import AddUserModal from './components/AddUserModal';
import Toast from './components/Toast';

// Define the type for public table names from the database schema
type PublicTableName = keyof Database['public']['Tables'];

// Define a type for our managed tables to ensure schema is correctly typed
type ManagedTable = {
  // Use 'public' for standard tables and a special identifier for auth users
  schema: 'public' | 'auth'; 
  name: PublicTableName | 'users';
  icon: React.ReactElement;
};

// Define the tables to be displayed in the dashboard
const managedTables: ManagedTable[] = [
  { schema: 'public', name: 'subscriptions', icon: <TableIcon className="w-5 h-5" /> },
  { schema: 'public', name: 'referral_usage', icon: <TableIcon className="w-5 h-5" /> },
  { schema: 'public', name: 'user_progress', icon: <TableIcon className="w-5 h-5" /> },
  { schema: 'auth', name: 'users', icon: <UsersIcon className="w-5 h-5" /> },
];

// Helper to format Supabase errors into a readable string
const formatSupabaseError = (error: any): string => {
    if (!error) return 'An unknown error occurred.';

    // Check for Supabase error structure (which has a `message` property)
    if (typeof error === 'object' && error !== null && 'message' in error) {
        let message = String(error.message);

        if ('details' in error && typeof error.details === 'string' && error.details) {
            message += ` (${error.details})`;
        }
        
        if (message.includes('failed to fetch')) {
            return 'Network error: Failed to connect to Supabase. Please check your network connection and Supabase URL.';
        }
        
        // Provide more user-friendly messages for common issues
        if (message.includes('JWT')) {
            return 'Authentication error: Invalid Supabase key (JWT). Please check your credentials.';
        }
        if (message.includes('relation') && message.includes('does not exist')) {
             return `Database schema error: A required table was not found. Details: ${message}`;
        }

        return message;
    }

    // Handle standard JavaScript Error objects
    if (error instanceof Error) {
        return error.message;
    }

    // Fallback for other types
    return 'An unknown error occurred. Check the browser console for more details.';
};


const App: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<ManagedTable>(managedTables[0]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);

  // CRUD Modals state
  const [isEditAddModalOpen, setIsEditAddModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentRow, setCurrentRow] = useState<any | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ id: Date.now(), message, type });
  };
  
  const isUsersTable = selectedTable.schema === 'auth' && selectedTable.name === 'users';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData([]);
    setHeaders([]);
    
    const client = createClient(supabaseUrl, supabaseKey);

    try {
      let tableData: any[] | null = [];
      let tableError: any = null;

      if (isUsersTable) {
        // Use the dedicated admin function to list users securely
        const { data: usersData, error: usersError } = await client.auth.admin.listUsers({
          page: 1,
          perPage: 100,
        });
        tableData = usersData?.users || [];
        tableError = usersError;
      } else {
        // Use standard query for all other public tables
        const { data: standardData, error: standardError } = await client
          .from(selectedTable.name)
          .select('*')
          .limit(100)
          .order('id', { ascending: false });
        tableData = standardData;
        tableError = standardError;
      }
      
      if (tableError) throw tableError;
      
      if (tableData && tableData.length > 0) {
        setHeaders(Object.keys(tableData[0]));
        setData(tableData);
      } else {
        setData([]); // Ensure data is an empty array if no results
      }
    } catch (err: any) {
      console.error(`Error fetching ${selectedTable.schema}.${selectedTable.name}:`, err);
      setError(`Error fetching data: ${formatSupabaseError(err)}`);
    } finally {
      setLoading(false);
    }
  }, [selectedTable, isUsersTable]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers for standard tables
  const handleAddNew = () => {
    setModalMode('add');
    setCurrentRow(null);
    setIsEditAddModalOpen(true);
  };

  const handleEdit = (row: any) => {
    setModalMode('edit');
    setCurrentRow(row);
    setIsEditAddModalOpen(true);
  };

  const handleDelete = async (row: any) => {
    if (window.confirm(`Are you sure you want to delete this row? (ID: ${row.id})`)) {
      setLoading(true);
      try {
        const client = createClient(supabaseUrl, supabaseKey);

        const { error: deleteError } = await client
          .from(selectedTable.name)
          .delete()
          .eq('id', row.id);
        
        if (deleteError) throw deleteError;
        
        showToast('Row deleted successfully!', 'success');
        await fetchData(); // Refresh data
      } catch (err: any) {
        console.error('Error deleting row:', err);
        showToast(`Error: ${formatSupabaseError(err)}`, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (formData: any) => {
    setLoading(true);
    try {
        const client = createClient(supabaseUrl, supabaseKey);
        let error: any;

        if (isUsersTable) {
            throw new Error("Save operation is not permitted for users table.");
        }
        
        const tableName = selectedTable.name as PublicTableName;

        // Use a switch on the table name to provide type safety for Supabase operations
        switch (tableName) {
            case 'subscriptions':
                if (modalMode === 'add') {
                    const { error: insertError } = await client.from('subscriptions').insert([formData]);
                    error = insertError;
                } else {
                    const { error: updateError } = await client.from('subscriptions').update(formData).eq('id', currentRow.id);
                    error = updateError;
                }
                break;
            case 'referral_usage':
                 if (modalMode === 'add') {
                    const { error: insertError } = await client.from('referral_usage').insert([formData]);
                    error = insertError;
                } else {
                    const { error: updateError } = await client.from('referral_usage').update(formData).eq('id', currentRow.id);
                    error = updateError;
                }
                break;
            case 'user_progress':
                 if (modalMode === 'add') {
                    const { error: insertError } = await client.from('user_progress').insert([formData]);
                    error = insertError;
                } else {
                    const { error: updateError } = await client.from('user_progress').update(formData).eq('id', currentRow.id);
                    error = updateError;
                }
                break;
            default: {
                // This ensures that if we add a new table to PublicTableName, we must handle it here.
                const exhaustiveCheck: never = tableName;
                throw new Error(`Unhandled table: ${exhaustiveCheck}`);
            }
        }
        
        if (error) throw error;
        
        showToast(`Row ${modalMode === 'add' ? 'added' : 'updated'} successfully!`, 'success');
        setIsEditAddModalOpen(false);
        await fetchData();
    } catch (err: any) {
        console.error(`Error saving row:`, err);
        showToast(`Error: ${formatSupabaseError(err)}`, 'error');
    } finally {
        setLoading(false);
    }
  };
  
  // Handlers for user management
  const handleAddNewUser = () => {
    setIsAddUserModalOpen(true);
  };

  const handleCreateUser = async (userData: { email: string; password: string; metadata: object; }): Promise<string | null> => {
    try {
      const client = createClient(supabaseUrl, supabaseKey);
      const { error } = await client.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: userData.metadata,
        email_confirm: true, // Auto-confirm user since they are created by an admin
      });

      if (error) throw error;
      
      showToast('User created successfully!', 'success');
      setIsAddUserModalOpen(false);
      await fetchData(); // Refresh user list, this will manage the loading state of the table
      return null; // Indicates success
    } catch (err: any) {
      console.error('Error creating user:', err);
      const errorMessage = formatSupabaseError(err);
      // Return error message to be displayed in the modal
      return errorMessage;
    }
  };

  const handleManageUser = (user: User) => {
    setCurrentRow(user);
    setIsUserModalOpen(true);
  };

  const handleUpdateUser = async (userId: string, metadata: object) => {
    setLoading(true);
    try {
      const client = createClient(supabaseUrl, supabaseKey);
      const { error } = await client.auth.admin.updateUserById(userId, {
        user_metadata: metadata,
      });
      if (error) throw error;
      showToast('User metadata updated successfully!', 'success');
      setIsUserModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Error updating user:', err);
      showToast(`Error: ${formatSupabaseError(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setLoading(true);
    try {
      const client = createClient(supabaseUrl, supabaseKey);
      const { error } = await client.auth.admin.deleteUser(userId);
      if (error) throw error;
      showToast('User deleted successfully!', 'success');
      setIsUserModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      showToast(`Error: ${formatSupabaseError(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderCell = (item: any) => {
    if (item === null) return <span className="text-slate-500 italic">null</span>;
    if (typeof item === 'boolean') return <span className="font-mono">{item ? 'true' : 'false'}</span>;
    if (typeof item === 'object') {
      return (
        <pre className="bg-slate-900 text-xs p-1 rounded overflow-auto max-w-xs max-h-24 font-mono">
          {JSON.stringify(item, null, 2)}
        </pre>
      );
    }
    return String(item);
  };
  
  return (
    <>
      <div className="min-h-screen bg-slate-900 flex text-slate-100 font-sans">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-800/50 p-4 border-r border-slate-700 flex flex-col flex-shrink-0">
          <div className="flex items-center gap-3 mb-8 px-2">
              <LogoIcon />
              <h1 className="text-xl font-bold text-white tracking-tight">Admin Panel</h1>
          </div>
          <nav className="flex-grow">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">Tables</h2>
            <ul className="space-y-1">
              {managedTables.map(table => (
                <li key={`${table.schema}.${table.name}`}>
                  <button 
                    onClick={() => setSelectedTable(table)} 
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                      selectedTable.name === table.name 
                        ? 'bg-sky-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {table.icon}
                    <span className="capitalize">{table.name.replace(/_/g, ' ')}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <footer className="text-center text-slate-500 text-xs"><p>Powered by React & Supabase</p></footer>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <header className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-white capitalize">{selectedTable.name.replace(/_/g, ' ')}</h2>
                <p className="text-slate-400">Viewing <code className="bg-slate-700 text-xs px-1.5 py-0.5 rounded font-mono">{`${selectedTable.schema}.${selectedTable.name}`}</code></p>
            </div>
            {isUsersTable ? (
                <button onClick={handleAddNewUser} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2 rounded-md transition duration-200">
                    <PlusIcon className="w-5 h-5"/>
                    Add User
                </button>
            ) : (
                 <button onClick={handleAddNew} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2 rounded-md transition duration-200">
                    <PlusIcon className="w-5 h-5"/>
                    Add Row
                </button>
            )}
          </header>

          <div className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
               {loading && data.length === 0 && (
                <div className="flex justify-center items-center py-20"><LoadingSpinnerIcon /><p className="ml-3 text-slate-400">Loading data...</p></div>
              )}
              {error && <div className="p-6"><p className="text-center text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p></div>}
              
              {!loading && !error && data.length === 0 && (
                  <div className="text-center py-20 text-slate-500"><h3 className="text-lg font-medium">No Rows Found</h3><p>This table is empty.</p></div>
              )}

              {!error && data.length > 0 && (
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-800/50">
                    <tr>
                      {headers.map(h => <th key={h} scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">{h.replace(/_/g, ' ')}</th>)}
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800 divide-y divide-slate-700">
                    {data.map((row, rowIndex) => (
                      <tr key={row.id || rowIndex} className="hover:bg-slate-700/50 transition-colors duration-150">
                        {headers.map(header => <td key={`${row.id || rowIndex}-${header}`} className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">{renderCell(row[header])}</td>)}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                                {isUsersTable ? (
                                    <button onClick={() => handleManageUser(row)} className="p-2 rounded-full text-slate-400 hover:bg-slate-600 hover:text-sky-400 transition-colors" title="Manage User">
                                        <CogIcon className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={() => handleEdit(row)} className="p-2 rounded-full text-slate-400 hover:bg-slate-600 hover:text-sky-400 transition-colors" title="Edit Row"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(row)} className="p-2 rounded-full text-slate-400 hover:bg-slate-600 hover:text-red-400 transition-colors" title="Delete Row"><TrashIcon className="w-4 h-4" /></button>
                                    </>
                                )}
                            </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {isEditAddModalOpen && (
        <EditAddModal
          isOpen={isEditAddModalOpen}
          onClose={() => setIsEditAddModalOpen(false)}
          onSave={handleSave}
          mode={modalMode}
          initialData={currentRow}
          columns={headers}
          tableName={selectedTable.name}
        />
      )}
      
      {isUserModalOpen && currentRow && (
        <UserManagementModal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          user={currentRow}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {isAddUserModalOpen && (
        <AddUserModal
          isOpen={isAddUserModalOpen}
          onClose={() => setIsAddUserModalOpen(false)}
          onCreateUser={handleCreateUser}
        />
      )}
      
      {toast && (
          <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onDismiss={() => setToast(null)}
          />
      )}
    </>
  );
};

export default App;
