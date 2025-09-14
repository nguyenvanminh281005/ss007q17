import React, { useState, useEffect } from 'react';
import { grantAttendancePermission, revokeAttendancePermission, listAllPermissions } from '../utils/permissionSetup';
import type { StudentPermission } from '../types';

export const PermissionManagementPage: React.FC = () => {
  const [permissions, setPermissions] = useState<StudentPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMSSV, setNewMSSV] = useState('');
  const [newRole, setNewRole] = useState<'student' | 'group_leader' | 'teacher'>('student');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const perms = await listAllPermissions();
      setPermissions(perms);
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const handleGrantPermission = async () => {
    if (!newMSSV.trim()) return;
    
    setActionLoading('grant');
    try {
      await grantAttendancePermission(newMSSV.trim(), newRole);
      setNewMSSV('');
      await loadPermissions();
    } catch (error) {
      console.error('Error granting permission:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokePermission = async (mssv: string) => {
    setActionLoading(mssv);
    try {
      await revokeAttendancePermission(mssv);
      await loadPermissions();
    } catch (error) {
      console.error('Error revoking permission:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      teacher: 'bg-red-100 text-red-800',
      group_leader: 'bg-blue-100 text-blue-800',
      student: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      teacher: 'Giáo viên',
      group_leader: 'Lớp trưởng',
      student: 'Sinh viên'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[role as keyof typeof colors]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4 text-gray-600">Đang tải danh sách quyền...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quản lý Quyền hạn</h1>
        <p className="text-gray-600">Quản lý quyền điểm danh và chỉnh sửa điểm cho sinh viên</p>
      </div>

      {/* Add new permission */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cấp quyền mới</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Nhập MSSV (VD: 22127001)"
            value={newMSSV}
            onChange={(e) => setNewMSSV(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as typeof newRole)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="student">Sinh viên</option>
            <option value="group_leader">Lớp trưởng</option>
            <option value="teacher">Giáo viên</option>
          </select>
          <button
            onClick={handleGrantPermission}
            disabled={!newMSSV.trim() || actionLoading === 'grant'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading === 'grant' ? 'Đang cấp...' : 'Cấp quyền'}
          </button>
        </div>
      </div>

      {/* Permissions list */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Danh sách Quyền hạn ({permissions.length})
          </h2>
        </div>
        
        {permissions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Chưa có quyền nào được cấp</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MSSV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vai trò
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quyền điểm danh
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quyền chỉnh sửa điểm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày cập nhật
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {permissions.map((permission) => (
                  <tr key={permission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {permission.studentAccount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(permission.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        permission.canMarkAttendance 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {permission.canMarkAttendance ? 'Có' : 'Không'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        permission.canEditGrades 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {permission.canEditGrades ? 'Có' : 'Không'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {permission.updatedAt.toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleRevokePermission(permission.studentAccount)}
                        disabled={actionLoading === permission.studentAccount}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === permission.studentAccount ? 'Đang thu hồi...' : 'Thu hồi quyền'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};