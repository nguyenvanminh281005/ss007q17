import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { studentService } from '../services/studentService';
import { attendanceService } from '../services/attendanceService';
import { permissionService } from '../services/permissionService';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from '../components/Auth/LoginModal';
import toast from 'react-hot-toast';
import type { Student, AttendanceRecord, StudentPermission } from '../types';

const AttendancePage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [participation, setParticipation] = useState<Record<string, number>>({});
  const [userPermission, setUserPermission] = useState<StudentPermission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user, logout } = useAuth();
  
  const today = new Date();
  const todayDisplay = format(today, 'dd/MM/yyyy');

  // Load students and today's attendance
  useEffect(() => {
    loadData();
  }, []);

  // Load user permission when user changes
  useEffect(() => {
    if (user?.studentAccount) {
      loadUserPermission(user.studentAccount);
    } else {
      setUserPermission(null);
    }
  }, [user]);

  // Filter students based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(student => 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.group.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, [students, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load students
      const studentsData = await studentService.getAllStudents();
      console.log('Students loaded:', studentsData);
      
      // Filter out teachers (assuming teachers have specific accounts like 'ldvinh')
      const studentsList = studentsData.filter(student => {
        // Keep only students with numeric MSSV and valid group (exclude teachers)
        return /^\d+$/.test(student.account) && 
               student.group !== 'nan' && 
               student.group && 
               !student.group.toLowerCase().includes('teacher');
      });
      
      // Sort by group first, then by account (MSSV) within group
      const sortedStudents = studentsList.sort((a, b) => {
        // First sort by group
        const groupCompare = a.group.localeCompare(b.group);
        if (groupCompare !== 0) return groupCompare;
        
        // Within same group, sort by account (MSSV)
        return a.account.localeCompare(b.account);
      });
      
      setStudents(sortedStudents);
      
      // Load today's attendance
      const attendanceData = await attendanceService.getAttendanceByDate(today);
      console.log('Attendance loaded:', attendanceData);
      
      // Convert to lookup objects
      const attendanceLookup: Record<string, boolean> = {};
      const participationLookup: Record<string, number> = {};
      
      attendanceData.forEach((record: AttendanceRecord) => {
        attendanceLookup[record.studentAccount] = record.isPresent;
        participationLookup[record.studentAccount] = record.participationCount || 0;
      });
      
      setAttendance(attendanceLookup);
      setParticipation(participationLookup);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermission = async (studentAccount: string) => {
    try {
      const permission = await permissionService.getPermission(studentAccount);
      setUserPermission(permission);
      console.log('User permission loaded:', permission);
    } catch (error) {
      console.error('Error loading user permission:', error);
      setUserPermission(null);
    }
  };

  const handleAttendanceChange = async (studentAccount: string, isPresent: boolean) => {
    // Check if user is logged in
    if (!user) {
      toast.error('Vui lòng đăng nhập để điểm danh');
      setShowLoginModal(true);
      return;
    }

    // Check if user has permission to mark attendance
    if (!userPermission?.canMarkAttendance) {
      toast.error('Bạn không có quyền điểm danh');
      return;
    }
    
    try {
      setSaving(studentAccount);
      
      // Update local state immediately (optimistic update)
      setAttendance(prev => ({
        ...prev,
        [studentAccount]: isPresent
      }));
      
      // Save to Firebase
      await attendanceService.markAttendance(
        studentAccount, 
        today, 
        isPresent, 
        user?.uid || 'anonymous'
      );
      
      toast.success(`Đã ${isPresent ? 'điểm danh' : 'hủy điểm danh'} cho ${studentAccount}`);
    } catch (error) {
      console.error('Error saving attendance:', error);
      
      // Revert local state on error
      setAttendance(prev => ({
        ...prev,
        [studentAccount]: !isPresent
      }));
      
      toast.error('Không thể lưu điểm danh');
    } finally {
      setSaving(null);
    }
  };

  const handleParticipationChange = async (studentAccount: string, count: number) => {
    // Check if user is logged in
    if (!user) {
      toast.error('Vui lòng đăng nhập để cập nhật phát biểu');
      setShowLoginModal(true);
      return;
    }

    // Check if user has permission
    if (!userPermission?.canMarkAttendance) {
      toast.error('Bạn không có quyền cập nhật phát biểu');
      return;
    }
    
    try {
      setSaving(studentAccount);
      
      // Update local state immediately
      setParticipation(prev => ({
        ...prev,
        [studentAccount]: count
      }));
      
      // Save to Firebase
      await attendanceService.updateParticipation(
        studentAccount, 
        today, 
        count, 
        user?.uid || 'anonymous'
      );
      
      toast.success(`Đã cập nhật số lần phát biểu cho ${studentAccount}: ${count}`);
    } catch (error) {
      console.error('Error saving participation:', error);
      
      // Revert local state on error
      setParticipation(prev => ({
        ...prev,
        [studentAccount]: (prev[studentAccount] || 0)
      }));
      
      toast.error('Không thể cập nhật số lần phát biểu');
    } finally {
      setSaving(null);
    }
  };

  const handleLoginSuccess = () => {
    toast.success('Đã đăng nhập! Đang kiểm tra quyền điểm danh...');
    // Permission will be loaded automatically by useEffect when user changes
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Đã đăng xuất');
    } catch (error) {
      toast.error('Có lỗi khi đăng xuất');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const totalCount = filteredStudents.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Điểm danh lớp SS007Q17
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Ngày {todayDisplay}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm sinh viên, nhóm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 px-4 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {userPermission?.role === 'teacher' ? 'Giáo viên' : 
                       userPermission?.role === 'group_leader' ? 'Nhóm trưởng' : 'Sinh viên'}
                      {user.studentAccount && ` - ${user.studentAccount}`}
                      {userPermission?.canMarkAttendance && 
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                          Có quyền điểm danh
                        </span>
                      }
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Đăng nhập điểm danh
                </button>
              )}
            </div>
          </div>
          
          {/* Stats */}
          <div className="mt-4 flex gap-6">
            <div className="bg-blue-50 rounded-lg px-4 py-2">
              <p className="text-sm font-medium text-blue-900">Tổng số sinh viên</p>
              <p className="text-2xl font-bold text-blue-600">{totalCount}</p>
            </div>
            <div className="bg-green-50 rounded-lg px-4 py-2">
              <p className="text-sm font-medium text-green-900">Có mặt</p>
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
            </div>
            <div className="bg-red-50 rounded-lg px-4 py-2">
              <p className="text-sm font-medium text-red-900">Vắng mặt</p>
              <p className="text-2xl font-bold text-red-600">{totalCount - presentCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Danh sách sinh viên
              {searchTerm && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredStudents.length} kết quả cho "{searchTerm}")
                </span>
              )}
            </h2>
            
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {searchTerm ? 'Không tìm thấy kết quả nào' : 'Không có sinh viên nào trong danh sách'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        STT
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nhóm
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Họ và tên
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        MSSV
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {todayDisplay}
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Số lần phát biểu
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student, index) => {
                      const isPresent = attendance[student.account] || false;
                      const participationCount = participation[student.account] || 0;
                      const isSaving = saving === student.account;
                      
                      // Check if this is the first student in a new group
                      const isFirstInGroup = index === 0 || filteredStudents[index - 1].group !== student.group;
                      
                      return (
                        <tr key={student.account} className={`${isPresent ? 'bg-green-50' : 'bg-white'} ${isFirstInGroup ? 'border-t-2 border-blue-200' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              isFirstInGroup ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {student.group}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {student.surname} {student.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.account}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center">
                              {isSaving ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isPresent}
                                  onChange={(e) => handleAttendanceChange(student.account, e.target.checked)}
                                  disabled={!user || !userPermission?.canMarkAttendance}
                                  className={`h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded ${
                                    !user || !userPermission?.canMarkAttendance ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                                  }`}
                                  title={
                                    !user ? 'Vui lòng đăng nhập để điểm danh' : 
                                    !userPermission?.canMarkAttendance ? 'Bạn không có quyền điểm danh' : ''
                                  }
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleParticipationChange(student.account, Math.max(0, participationCount - 1))}
                                disabled={!user || !userPermission?.canMarkAttendance || isSaving || participationCount <= 0}
                                className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold"
                                title="Giảm số lần phát biểu"
                              >
                                −
                              </button>
                              <span className="w-12 text-center text-sm font-medium text-gray-900">
                                {participationCount}
                              </span>
                              <button
                                onClick={() => handleParticipationChange(student.account, participationCount + 1)}
                                disabled={!user || !userPermission?.canMarkAttendance || isSaving}
                                className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold"
                                title="Tăng số lần phát biểu"
                              >
                                +
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default AttendancePage;
