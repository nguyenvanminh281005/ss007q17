import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { studentService } from '../services/studentService';
import { attendanceService } from '../services/attendanceService';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from '../components/Auth/LoginModal';
import toast from 'react-hot-toast';
import type { Student, AttendanceRecord } from '../types';

const AttendancePage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
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

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load students
      const studentsData = await studentService.getAllStudents();
      console.log('Students loaded:', studentsData);
      setStudents(studentsData.sort((a, b) => {
        // Sort by surname first, then name
        const surnameCompare = a.surname.localeCompare(b.surname);
        return surnameCompare !== 0 ? surnameCompare : a.name.localeCompare(b.name);
      }));
      
      // Load today's attendance
      const attendanceData = await attendanceService.getAttendanceByDate(today);
      console.log('Attendance loaded:', attendanceData);
      
      // Convert to lookup object
      const attendanceLookup: Record<string, boolean> = {};
      attendanceData.forEach((record: AttendanceRecord) => {
        attendanceLookup[record.studentAccount] = record.isPresent;
      });
      
      setAttendance(attendanceLookup);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = async (studentAccount: string, isPresent: boolean) => {
    // Check if user has permission to mark attendance
    if (!user) {
      toast.error('Vui lòng đăng nhập để điểm danh');
      setShowLoginModal(true);
      return;
    }

    // TODO: Add permission check here
    // For now, allow all logged-in users to mark attendance
    
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

  const handleLoginSuccess = () => {
    toast.success('Đã đăng nhập, bạn có thể điểm danh bây giờ!');
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
  const totalCount = students.length;

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
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.role === 'teacher' ? 'Giáo viên' : 
                       user.role === 'group_leader' ? 'Nhóm trưởng' : 'Sinh viên'}
                      {user.studentAccount && ` - ${user.studentAccount}`}
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
            </h2>
            
            {students.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Không có sinh viên nào trong danh sách</p>
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
                        Họ và tên
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        MSSV
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nhóm
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {todayDisplay}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student, index) => {
                      const isPresent = attendance[student.account] || false;
                      const isSaving = saving === student.account;
                      
                      return (
                        <tr key={student.account} className={isPresent ? 'bg-green-50' : 'bg-white'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {student.surname} {student.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.account}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.group}
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
                                  disabled={!user} // Disable if not logged in
                                  className={`h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded ${
                                    !user ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                                  }`}
                                  title={!user ? 'Vui lòng đăng nhập để điểm danh' : ''}
                                />
                              )}
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
