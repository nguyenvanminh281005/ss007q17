import React, { useState, useEffect } from 'react';
import { attendanceService } from '../services/attendanceService';
import { studentService } from '../services/studentService';
import toast from 'react-hot-toast';
import type { Student } from '../types';

interface AttendanceSummary {
  student: Student;
  totalClasses: number;
  presentClasses: number;
  absentClasses: number;
  attendanceRate: number;
  totalParticipation: number;
}

interface ClassStats {
  totalClasses: number;
  totalStudents: number;
  averageAttendanceRate: number;
  studentsAbove80: number;
  studentsAbove70: number;
  studentsBelow50: number;
}

const AttendanceSummaryPage: React.FC = () => {
  const [summaryData, setSummaryData] = useState<AttendanceSummary[]>([]);
  const [classStats, setClassStats] = useState<ClassStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'attendanceRate' | 'absentClasses' | 'name'>('attendanceRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadSummaryData();
  }, []);

  const loadSummaryData = async () => {
    try {
      setLoading(true);

      // Load students
      const studentsData = await studentService.getAllStudents();
      
      // Filter out teachers (same logic as AttendancePage)
      const studentsList = studentsData.filter(student => {
        return /^\d+$/.test(student.account) && 
               student.group !== 'nan' && 
               student.group && 
               !student.group.toLowerCase().includes('teacher');
      });

      // Get all attendance dates
      const attendanceDates = await attendanceService.getAttendanceDates();
      const totalClasses = attendanceDates.length;

      console.log(`Found ${totalClasses} class sessions`);

      // Load all attendance records
      const allAttendancePromises = attendanceDates.map(date => {
        const dateObj = new Date(date + 'T00:00:00');
        return attendanceService.getAttendanceByDate(dateObj);
      });

      const allAttendanceResults = await Promise.all(allAttendancePromises);
      const allAttendanceRecords = allAttendanceResults.flat();

      // Calculate summary for each student
      const summaries: AttendanceSummary[] = studentsList.map(student => {
        const studentRecords = allAttendanceRecords.filter(
          record => record.studentAccount === student.account
        );

        const presentClasses = studentRecords.filter(record => record.isPresent).length;
        const absentClasses = totalClasses - presentClasses;
        const attendanceRate = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;
        
        const totalParticipation = studentRecords.reduce(
          (sum, record) => sum + (record.participationCount || 0), 0
        );

        return {
          student,
          totalClasses,
          presentClasses,
          absentClasses,
          attendanceRate,
          totalParticipation
        };
      });

      // Sort summaries
      const sortedSummaries = sortSummaries(summaries, sortBy, sortOrder);
      setSummaryData(sortedSummaries);

      // Calculate class statistics
      const stats: ClassStats = {
        totalClasses,
        totalStudents: studentsList.length,
        averageAttendanceRate: summaries.reduce((sum, s) => sum + s.attendanceRate, 0) / summaries.length,
        studentsAbove80: summaries.filter(s => s.attendanceRate >= 80).length,
        studentsAbove70: summaries.filter(s => s.attendanceRate >= 70).length,
        studentsBelow50: summaries.filter(s => s.attendanceRate < 50).length,
      };

      setClassStats(stats);

    } catch (error) {
      console.error('Error loading summary data:', error);
      toast.error('Không thể tải dữ liệu tổng kết');
    } finally {
      setLoading(false);
    }
  };

  const sortSummaries = (data: AttendanceSummary[], sortBy: string, order: 'asc' | 'desc') => {
    return [...data].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'attendanceRate':
          compareValue = a.attendanceRate - b.attendanceRate;
          break;
        case 'absentClasses':
          compareValue = a.absentClasses - b.absentClasses;
          break;
        case 'name':
          compareValue = (a.student.surname + a.student.name).localeCompare(
            b.student.surname + b.student.name
          );
          break;
        default:
          compareValue = 0;
      }
      
      return order === 'desc' ? -compareValue : compareValue;
    });
  };

  const handleSort = (newSortBy: 'attendanceRate' | 'absentClasses' | 'name') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
    
    const sorted = sortSummaries(summaryData, newSortBy, sortOrder === 'asc' ? 'desc' : 'asc');
    setSummaryData(sorted);
  };

  const exportToExcel = () => {
    // Create CSV content
    const headers = ['STT', 'Mã sinh viên', 'Họ tên', 'Nhóm', 'Tổng số buổi', 'Có mặt', 'Vắng', '% chuyên cần', 'Tổng phát biểu'];
    const csvContent = [
      headers.join(','),
      ...summaryData.map((summary, index) => [
        index + 1,
        summary.student.account,
        `"${summary.student.surname} ${summary.student.name}"`,
        summary.student.group,
        summary.totalClasses,
        summary.presentClasses,
        summary.absentClasses,
        summary.attendanceRate.toFixed(2) + '%',
        summary.totalParticipation
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_summary_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Đã xuất file Excel thành công!');
  };

  const printReport = () => {
    window.print();
    toast.success('Đang chuẩn bị in báo cáo...');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu tổng kết...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow print:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between print:block">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Tổng kết điểm danh cuối kỳ
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Lớp SS007Q17 - Học kỳ {new Date().getFullYear()}
              </p>
            </div>
            
            <div className="flex items-center gap-4 print:hidden">
              <button
                onClick={() => window.history.back()}
                className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200 transition-colors"
              >
                ← Quay lại
              </button>
              <button
                onClick={exportToExcel}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                📊 Xuất Excel
              </button>
              <button
                onClick={printReport}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                🖨️ In báo cáo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      {classStats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow p-6 print:shadow-none">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Thống kê tổng quan</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{classStats.totalClasses}</p>
                <p className="text-sm text-gray-600">Tổng số buổi học</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{classStats.totalStudents}</p>
                <p className="text-sm text-gray-600">Sĩ số lớp</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{classStats.averageAttendanceRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">TB chuyên cần</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{classStats.studentsAbove80}</p>
                <p className="text-sm text-gray-600">SV ≥ 80% chuyên cần</p>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-lg font-bold text-orange-600">{classStats.studentsAbove70}</p>
                <p className="text-sm text-gray-600">SV ≥ 70% chuyên cần</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-lg font-bold text-red-600">{classStats.studentsBelow50}</p>
                <p className="text-sm text-gray-600">SV &lt; 50% chuyên cần</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg print:shadow-none">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4 print:block">
              <h2 className="text-lg font-medium text-gray-900">
                Bảng điểm danh chi tiết ({summaryData.length} sinh viên)
              </h2>
              <div className="flex gap-2 print:hidden">
                <select
                  value={sortBy}
                  onChange={(e) => handleSort(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1"
                >
                  <option value="attendanceRate">Sắp xếp theo % chuyên cần</option>
                  <option value="absentClasses">Sắp xếp theo số buổi vắng</option>
                  <option value="name">Sắp xếp theo tên</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      STT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã sinh viên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Họ tên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nhóm
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tổng số buổi
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Có mặt
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vắng
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % chuyên cần
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tổng phát biểu
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summaryData.map((summary, index) => (
                    <tr 
                      key={summary.student.account}
                      className={summary.attendanceRate < 70 ? 'bg-red-50' : 'hover:bg-gray-50'}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {summary.student.account}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {summary.student.surname} {summary.student.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {summary.student.group}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {summary.totalClasses}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-center font-medium">
                        {summary.presentClasses}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-center font-medium">
                        {summary.absentClasses}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                          summary.attendanceRate >= 80 ? 'bg-green-100 text-green-800' :
                          summary.attendanceRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          summary.attendanceRate >= 50 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {summary.attendanceRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 text-center font-medium">
                        {summary.totalParticipation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSummaryPage;