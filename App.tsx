
import React, { useState, useEffect, useCallback } from 'react';
import { createClient, User } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from './services/supabase';
import { Database } from './types';
import { LogoIcon, LoadingSpinnerIcon, TableIcon, UsersIcon, PlusIcon, PencilIcon, TrashIcon, CogIcon } from './components/Icons';
import EditAddModal from './components/EditAddModal';
import UserManagementModal from './components/UserManagementModal';
import AddUserModal from './components/AddUserModal';
import Toast from './components/Toast';

// Define the type for public table names from the database schema.
// By defining this as a literal union type, we avoid overly complex type inference
// that was causing "Type instantiation is excessively deep" errors.
type PublicTableName = 'subscriptions' | 'referral_usage' | 'user_progress';

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

// Tables that have a `user_id` field and a relationship to `auth.users`
const tablesWithUsers = ['subscriptions', 'referral_usage', 'user_progress'];

// A more robust helper to format Supabase errors into a readable string.
const formatSupabaseError = (error: any): string => {
    if (!error) return 'An unknown error occurred.';
    if (typeof error === 'string') return error;

    // Standard JS Error object and most Supabase errors have a `message` property.
    if (error.message && typeof error.message === 'string' && error.message.trim()) {
        return error.message;
    }

    // For other cases (like some Auth errors), stringify the object.
    try {
        const jsonString = JSON.stringify(error);
        if (jsonString !== '{}') {
            return jsonString;
        }
    } catch (e) {
        // Fall through if stringify fails (e.g., circular references)
    }
    
    // Last resort to avoid '[object Object]'
    const fallbackString = String(error);
    if (fallbackString !== '[object Object]') {
        return fallbackString;
    }

    return 'An unknown error occurred. Check the developer console for details.';
};


const App: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<ManagedTable>(managedTables[0]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

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

  const fetchAllUsers = useCallback(async () => {
    const client = createClient<Database>(supabaseUrl, supabaseKey);
    let allFetchedUsers: User[] = [];
    let page = 1;

    try {
      while (true) { // Loop until no more users are returned
        const { data: usersData, error: usersError } = await client.auth.admin.listUsers({
          page,
          perPage: 100, // Fetch in batches of 100
        });

        if (usersError) {
          console.error(`Error fetching page ${page} of users:`, usersError);
          // Stop fetching if an error occurs, but still use what we've got
          break;
        }

        if (usersData && usersData.users.length > 0) {
          allFetchedUsers.push(...usersData.users);
          page++;
        } else {
          // No more users to fetch, exit the loop
          break;
        }
      }
      setAllUsers(allFetchedUsers);
    } catch (err) {
      console.error("Failed to fetch all users:", err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData([]);
    setHeaders([]);
    
    try {
      const client = createClient<Database>(supabaseUrl, supabaseKey);
      
      if (isUsersTable) {
        // `allUsers` state is the single source of truth for the users table.
        setData(allUsers);
        if (allUsers.length > 0) {
            setHeaders(Object.keys(allUsers[0]));
        }
      } else if (selectedTable.name === 'subscriptions' || selectedTable.name === 'user_progress') {
          const tableName = selectedTable.name;
          const { data: tableData, error: tableError } = await client
              .from(tableName)
              .select('*');

          if (tableError) throw tableError;

          const dataByUser = new Map<string, any[]>();
          if (tableData) {
              for (const record of tableData) {
                  if (!dataByUser.has(record.user_id)) {
                      dataByUser.set(record.user_id, []);
                  }
                  dataByUser.get(record.user_id)!.push(record);
              }
          }

          const schemaHeaders: { [key: string]: string[] } = {
              subscriptions: ['id', 'user_id', 'plan', 'status', 'start_date', 'end_date', 'created_at'],
              user_progress: ['id', 'user_id', 'course_id', 'lesson_id', 'progress_percentage', 'completed_at', 'created_at', 'updated_at'],
          };
          
          const actualHeaders = tableData && tableData.length > 0
              ? Object.keys(tableData[0])
              : schemaHeaders[tableName] || [];
          setHeaders(actualHeaders);

          const displayData: any[] = [];
          for (const user of allUsers) {
              const userRecords = dataByUser.get(user.id);
              if (userRecords && userRecords.length > 0) {
                  displayData.push(...userRecords);
              } else {
                  const placeholderRow: any = { user_id: user.id, id: null };
                  for (const header of actualHeaders) {
                      if (header !== 'user_id') placeholderRow[header] = null;
                  }
                  displayData.push(placeholderRow);
              }
          }
          
          const userEmailMap = new Map(allUsers.map(u => [u.id, u.email || '']));
          displayData.sort((a, b) => {
              const emailA = userEmailMap.get(a.user_id) || '';
              const emailB = userEmailMap.get(b.user_id) || '';
              if (emailA < emailB) return -1;
              if (emailA > emailB) return 1;
              if (a.id && b.id) return a.id - b.id;
              if (a.id) return -1;
              if (b.id) return 1;
              return 0;
          });

          setData(displayData);
      } else {
        const { data: standardData, error: standardError } = await client
          .from(selectedTable.name as PublicTableName)
          .select('*')
          .order('id', { ascending: false });
        
        if (standardError) throw standardError;
      
        if (standardData && standardData.length > 0) {
          const keys = Object.keys(standardData[0]);
          setHeaders(keys);
          setData(standardData);
        } else {
          setData([]);
          setHeaders([]);
        }
      }
    } catch (err: any) {
      const errorMessage = formatSupabaseError(err);
      console.error(`Error fetching ${selectedTable.schema}.${selectedTable.name}:`, err);
      setError(`Error fetching data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [selectedTable, isUsersTable, allUsers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // Handlers for standard tables
  const handleAddNew = () => {
    setModalMode('add');
    setCurrentRow(null);
    setIsEditAddModalOpen(true);
  };
  
  const handleAddNewRecordForUser = (userId: string) => {
    setModalMode('add');
    setCurrentRow({ user_id: userId });
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
        const client = createClient<Database>(supabaseUrl, supabaseKey);

        const { error: deleteError } = await client
          .from(selectedTable.name as PublicTableName)
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
        const client = createClient<Database>(supabaseUrl, supabaseKey);
        let postgrestError: any;

        if (isUsersTable) {
            throw new Error("Save operation is not permitted for users table.");
        }
        
        const tableName = selectedTable.name as PublicTableName;
        const dataToSave = { ...formData };

        switch(tableName) {
            case 'subscriptions': {
                if (modalMode === 'add') {
                    const { error } = await client.from('subscriptions').insert([dataToSave]);
                    postgrestError = error;
                } else {
                    const { error } = await client.from('subscriptions').update(dataToSave).eq('id', currentRow.id);
                    postgrestError = error;
                }
                break;
            }
            case 'referral_usage': {
                if (dataToSave.details && typeof dataToSave.details === 'string') {
                    try { dataToSave.details = JSON.parse(dataToSave.details); } catch (e) {
                        console.error("Invalid JSON in details field", e);
                    }
                }
                if (modalMode === 'add') {
                    const { error } = await client.from('referral_usage').insert([dataToSave]);
                    postgrestError = error;
                } else {
                    const { error } = await client.from('referral_usage').update(dataToSave).eq('id', currentRow.id);
                    postgrestError = error;
                }
                break;
            }
            case 'user_progress': {
                if (dataToSave.progress_percentage != null && dataToSave.progress_percentage !== '') {
                    dataToSave.progress_percentage = Number(dataToSave.progress_percentage);
                } else if (dataToSave.progress_percentage === '') {
                    delete dataToSave.progress_percentage;
                }
                if (modalMode === 'add') {
                    const { error } = await client.from('user_progress').insert([dataToSave]);
                    postgrestError = error;
                } else {
                    const { error } = await client.from('user_progress').update(dataToSave).eq('id', currentRow.id);
                    postgrestError = error;
                }
                break;
            }
            default: {
                const exhaustiveCheck: never = tableName;
                throw new Error(`Unhandled table: ${exhaustiveCheck}`);
            }
        }
        
        if (postgrestError) throw postgrestError;
        
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
      const client = createClient<Database>(supabaseUrl, supabaseKey);
      const { error } = await client.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: userData.metadata,
        email_confirm: true, // Auto-confirm user since they are created by an admin
      });

      if (error) throw error;
      
      showToast('User created successfully!', 'success');
      setIsAddUserModalOpen(false);
      await fetchAllUsers(); // Refresh the master user list
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
      const client = createClient<Database>(supabaseUrl, supabaseKey);
      const { error } = await client.auth.admin.updateUserById(userId, {
        user_metadata: metadata,
      });
      if (error) throw error;
      showToast('User metadata updated successfully!', 'success');
      setIsUserModalOpen(false);
      await fetchAllUsers(); // Refresh the master user list
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
      const client = createClient<Database>(supabaseUrl, supabaseKey);
      const { error } = await client.auth.admin.deleteUser(userId);
      if (error) throw error;
      showToast('User deleted successfully!', 'success');
      setIsUserModalOpen(false);
      await fetchAllUsers(); // Refresh the master user list
    } catch (err: any) {
      console.error('Error deleting user:', err);
      showToast(`Error: ${formatSupabaseError(err)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderCell = (item: any, header: string, row: any) => {
    // Perform a client-side "join" to display user email instead of just the UUID.
    if (header === 'user_id' && tablesWithUsers.includes(selectedTable.name as string)) {
        const user = allUsers.find(u => u.id === item);
        return (
            <div>
                <span className="font-semibold text-sky-400">{user?.email || 'N/A'}</span>
                <div className="text-slate-500 text-xs font-mono mt-1">{item || ''}</div>
            </div>
        );
    }

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
                    {data.map((row) => {
                      const isPlaceholderRow = !row.id;
                      const isAllUserTableView = ['subscriptions', 'user_progress'].includes(selectedTable.name);
                      
                      return (
                      <tr key={row.id || `user-placeholder-${row.user_id}`} className="hover:bg-slate-700/50 transition-colors duration-150">
                        {headers.map(header => <td key={`${row.id || row.user_id}-${header}`} className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">{renderCell(row[header], header, row)}</td>)}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                                {isUsersTable ? (
                                    <button onClick={() => handleManageUser(row)} className="p-2 rounded-full text-slate-400 hover:bg-slate-600 hover:text-sky-400 transition-colors" title="Manage User">
                                        <CogIcon className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <>
                                        {isAllUserTableView && isPlaceholderRow ? (
                                             <button onClick={() => handleAddNewRecordForUser(row.user_id)} className="flex items-center gap-1 text-xs bg-sky-800 hover:bg-sky-700 text-white font-semibold px-2 py-1 rounded-md transition duration-200">
                                                <PlusIcon className="w-4 h-4"/>
                                                {selectedTable.name === 'subscriptions' ? 'Add Subscription' : 'Add Progress'}
                                            </button>
                                        ) : (
                                            <>
                                                <button onClick={() => handleEdit(row)} className="p-2 rounded-full text-slate-400 hover:bg-slate-600 hover:text-sky-400 transition-colors" title="Edit Row"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(row)} className="p-2 rounded-full text-slate-400 hover:bg-slate-600 hover:text-red-400 transition-colors" title="Delete Row"><TrashIcon className="w-4 h-4" /></button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </td>
                      </tr>
                      );
                    })}
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
          allUsers={allUsers}
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
