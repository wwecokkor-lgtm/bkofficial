
import React, { useEffect, useState, useMemo } from 'react';
import { UserProfile, UserRole, AccountStatus } from './types';
import { getAllUsers, bulkUserAction, searchUsers } from './api';
import { useAuth } from './AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import AdminUserModal from './AdminUserModal';

const AdminUsers = () => {
  const { userProfile: adminProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection & Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [classFilter, setClassFilter] = useState<string>('All');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const data = await getAllUsers();
    // Normalize old data
    const normalized = data.map(u => ({
        ...u, 
        role: u.role || UserRole.USER,
        status: u.status || (u.isBlocked ? 'suspended' : 'active'),
        classLevel: u.classLevel || 'N/A'
    }));
    setUsers(normalized);
    setLoading(false);
  };

  const handleSearch = async () => {
    if(!searchTerm) {
        fetchData(); 
        return;
    }
    const results = await searchUsers(searchTerm);
    setUsers(results);
  };

  // --- FILTER LOGIC ---
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchRole = roleFilter === 'All' || user.role === roleFilter;
      const matchStatus = statusFilter === 'All' || user.status === statusFilter;
      const matchClass = classFilter === 'All' || user.classLevel === classFilter;
      const matchSearch = !searchTerm || 
          user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
          user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchRole && matchStatus && matchClass && matchSearch;
    });
  }, [users, roleFilter, statusFilter, classFilter, searchTerm]);

  // --- BULK ACTIONS ---
  const handleBulkAction = async (action: 'activate' | 'suspend' | 'delete' | 'verify') => {
    if (!adminProfile) return;
    if (!confirm(`Are you sure you want to ${action.toUpperCase()} ${selectedIds.length} users?`)) return;
    
    await bulkUserAction(adminProfile.uid, selectedIds, action);
    setSelectedIds([]);
    fetchData();
  };

  const toggleSelect = (uid: string) => {
    if (selectedIds.includes(uid)) {
      setSelectedIds(selectedIds.filter(id => id !== uid));
    } else {
      setSelectedIds([...selectedIds, uid]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map(u => u.uid));
    }
  };

  // --- ANALYTICS DATA ---
  const roleData = [
    { name: 'Students', value: users.filter(u => u.role === UserRole.STUDENT).length },
    { name: 'Parents', value: users.filter(u => u.role === UserRole.PARENT).length },
    { name: 'Teachers', value: users.filter(u => u.role === UserRole.TEACHER).length },
    { name: 'Admins', value: users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN).length },
  ];
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* KPI Cards */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
               <h3 className="text-gray-500 font-bold text-sm uppercase">Total Users</h3>
               <p className="text-4xl font-bold text-gray-800 mt-2">{users.length}</p>
            </div>
            <div className="mt-4 flex space-x-4 text-xs font-bold">
               <span className="text-green-600 px-2 py-1 bg-green-50 rounded">Active: {users.filter(u => u.status === 'active').length}</span>
               <span className="text-red-600 px-2 py-1 bg-red-50 rounded">Banned: {users.filter(u => u.status === 'banned').length}</span>
            </div>
         </div>

         {/* Distribution Chart */}
         <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className="w-1/3">
               <h4 className="font-bold text-gray-700 mb-2">User Distribution</h4>
               <ul className="text-xs space-y-1 text-gray-500">
                  {roleData.map((d, i) => (
                     <li key={i} className="flex justify-between">
                        <span><span className="w-2 h-2 rounded-full inline-block mr-2" style={{backgroundColor: COLORS[i]}}></span>{d.name}</span>
                        <span className="font-bold">{d.value}</span>
                     </li>
                  ))}
               </ul>
            </div>
            <div className="w-2/3 h-32">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleData} layout="vertical">
                     <XAxis type="number" hide />
                     <YAxis dataKey="name" type="category" width={60} tick={{fontSize: 10}} hide />
                     <Tooltip />
                     <Bar dataKey="value" fill="#8884d8" barSize={20}>
                        {roleData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % 20]} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* 2. Controls & Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4 md:space-y-0 md:flex justify-between items-center">
         
         {/* Search */}
         <div className="relative w-full md:w-64">
            <i className="fas fa-search absolute left-3 top-2.5 text-gray-400"></i>
            <input 
               type="text" 
               placeholder="Search name, email..." 
               className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
         </div>

         {/* Filters */}
         <div className="flex flex-wrap gap-2">
            <select className="border px-3 py-2 rounded-lg text-sm bg-gray-50" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
               <option value="All">All Roles</option>
               <option value={UserRole.STUDENT}>Students</option>
               <option value={UserRole.TEACHER}>Teachers</option>
               <option value={UserRole.PARENT}>Parents</option>
               <option value={UserRole.ADMIN}>Admins</option>
            </select>
            <select className="border px-3 py-2 rounded-lg text-sm bg-gray-50" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
               <option value="All">All Status</option>
               <option value="active">Active</option>
               <option value="suspended">Suspended</option>
               <option value="banned">Banned</option>
            </select>
            <select className="border px-3 py-2 rounded-lg text-sm bg-gray-50" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
               <option value="All">All Classes</option>
               {[...Array(12)].map((_, i) => <option key={i} value={`Class ${i+1}`}>Class {i+1}</option>)}
            </select>
         </div>
      </div>

      {/* 3. Bulk Actions Toolbar (Visible when selected) */}
      {selectedIds.length > 0 && (
         <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex justify-between items-center animate-fade-in">
            <span className="font-bold text-blue-800">{selectedIds.length} users selected</span>
            <div className="flex space-x-2">
               <button onClick={() => handleBulkAction('activate')} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700">Activate</button>
               <button onClick={() => handleBulkAction('suspend')} className="bg-orange-500 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-orange-600">Suspend</button>
               <button onClick={() => handleBulkAction('delete')} className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-red-700">Delete</button>
            </div>
         </div>
      )}

      {/* 4. User Table */}
      <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-100">
         {loading ? (
            <div className="p-10 text-center text-gray-500">Loading users...</div>
         ) : (
            <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                     <tr>
                        <th className="px-6 py-4 text-left">
                           <input type="checkbox" checked={selectedIds.length === filteredUsers.length && filteredUsers.length > 0} onChange={toggleSelectAll} className="rounded" />
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">User Info</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Role / Class</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Joined</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                     {filteredUsers.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-500">No users found match filters.</td></tr>
                     ) : filteredUsers.map(user => (
                        <tr key={user.uid} className={`hover:bg-gray-50 transition ${selectedIds.includes(user.uid) ? 'bg-blue-50' : ''}`}>
                           <td className="px-6 py-4">
                              <input type="checkbox" checked={selectedIds.includes(user.uid)} onChange={() => toggleSelect(user.uid)} className="rounded" />
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center">
                                 <img className="h-10 w-10 rounded-full object-cover border" src={user.photoURL || 'https://via.placeholder.com/40'} alt="" />
                                 <div className="ml-3">
                                    <div className="text-sm font-bold text-gray-900 cursor-pointer hover:text-blue-600" onClick={() => {setSelectedUser(user); setShowDetailModal(true)}}>{user.displayName}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                    <div className="text-[10px] text-gray-400">{user.phone || 'No Phone'}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-opacity-20 
                                 ${user.role === UserRole.ADMIN ? 'bg-purple-600 text-purple-800' : 
                                   user.role === UserRole.TEACHER ? 'bg-orange-500 text-orange-800' :
                                   'bg-blue-100 text-blue-800'}`}>
                                 {user.role}
                              </span>
                              {user.role === UserRole.STUDENT && <div className="text-xs text-gray-500 mt-1">{user.classLevel}</div>}
                           </td>
                           <td className="px-6 py-4">
                              <span className={`px-2 py-1 inline-flex text-xs font-bold rounded-full 
                                 ${user.status === 'active' ? 'bg-green-100 text-green-800' : 
                                   user.status === 'banned' ? 'bg-red-100 text-red-800' : 
                                   'bg-yellow-100 text-yellow-800'}`}>
                                 {user.status.toUpperCase()}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-xs text-gray-500">
                              {new Date(user.joinDate).toLocaleDateString()}
                           </td>
                           <td className="px-6 py-4 text-right">
                              <button onClick={() => {setSelectedUser(user); setShowDetailModal(true);}} className="text-blue-600 hover:bg-blue-50 p-2 rounded">
                                 <i className="fas fa-eye"></i>
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </div>

      {/* 5. Detail Modal */}
      {showDetailModal && selectedUser && (
         <AdminUserModal 
            user={selectedUser} 
            onClose={() => {setShowDetailModal(false); setSelectedUser(null);}} 
            onUpdate={() => {fetchData();}}
         />
      )}

    </div>
  );
};

export default AdminUsers;
