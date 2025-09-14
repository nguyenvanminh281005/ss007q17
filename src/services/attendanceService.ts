import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from './firebase';
import type { AttendanceRecord, AttendanceFilter } from '../types';

class AttendanceService {
  private collectionName = 'attendance';

  /**
   * Get attendance records with filters
   */
  async getAttendanceRecords(filter: AttendanceFilter = {}): Promise<AttendanceRecord[]> {
    try {
      let q = query(collection(db, this.collectionName));
      
      // Apply filters
      if (filter.date) {
        q = query(q, where('date', '==', filter.date));
      }
      
      if (filter.studentAccount) {
        q = query(q, where('studentAccount', '==', filter.studentAccount));
      }
      
      // Simplified ordering - only order by one field to avoid index issues
      try {
        q = query(q, orderBy('date', 'desc'));
      } catch (orderError) {
        // If ordering fails, continue without it
        console.warn('Could not apply ordering, continuing without it:', orderError);
      }
      
      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as AttendanceRecord;
      });
      
      // Sort in memory if we couldn't order in the query
      return records.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return a.studentAccount.localeCompare(b.studentAccount);
      });
      
    } catch (error) {
      console.error('Error in getAttendanceRecords:', error);
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  }

  /**
   * Get attendance for specific date
   */
  async getAttendanceByDate(date: Date): Promise<AttendanceRecord[]> {
    const dateString = format(date, 'yyyy-MM-dd');
    return this.getAttendanceRecords({ date: dateString });
  }

  /**
   * Get attendance for specific student
   */
  async getAttendanceByStudent(studentAccount: string): Promise<AttendanceRecord[]> {
    return this.getAttendanceRecords({ studentAccount });
  }

  /**
   * Mark attendance for a student on specific date
   */
  async markAttendance(studentAccount: string, date: Date, isPresent: boolean, markedBy: string): Promise<void> {
    try {
      const dateString = format(date, 'yyyy-MM-dd');
      const docId = `${studentAccount}_${dateString}`;
      
      const attendanceData = {
        studentAccount,
        date: dateString,
        isPresent,
        updatedAt: Timestamp.now(),
        updatedBy: markedBy
      };

      // Check if record exists
      const existingRecords = await this.getAttendanceRecords({ 
        date: dateString, 
        studentAccount 
      });

      if (existingRecords.length > 0) {
        // Update existing record
        await updateDoc(doc(db, this.collectionName, docId), attendanceData);
      } else {
        // Create new record
        await setDoc(doc(db, this.collectionName, docId), {
          ...attendanceData,
          createdAt: Timestamp.now(),
          participationCount: 0 // Initialize with 0
        });
      }
    } catch (error) {
      throw new Error('Không thể lưu điểm danh.');
    }
  }

  /**
   * Update participation count for a student on specific date
   */
  async updateParticipation(studentAccount: string, date: Date, participationCount: number, updatedBy: string): Promise<void> {
    try {
      const dateString = format(date, 'yyyy-MM-dd');
      const docId = `${studentAccount}_${dateString}`;
      
      // Use set with merge to update participation count
      await setDoc(doc(db, this.collectionName, docId), {
        studentAccount,
        date: dateString,
        participationCount,
        updatedAt: Timestamp.now(),
        updatedBy
      }, { merge: true });
      
    } catch (error) {
      throw new Error('Không thể cập nhật số lần phát biểu.');
    }
  }

  /**
   * Batch mark attendance for multiple students
   */
  async batchMarkAttendance(attendanceData: Array<{
    studentAccount: string;
    date: Date;
    isPresent: boolean;
  }>, markedBy: string): Promise<void> {
    try {
      const promises = attendanceData.map(({ studentAccount, date, isPresent }) =>
        this.markAttendance(studentAccount, date, isPresent, markedBy)
      );
      
      await Promise.all(promises);
    } catch (error) {
      throw new Error('Không thể lưu điểm danh hàng loạt.');
    }
  }

  /**
   * Get attendance statistics for a date range
   */
  async getAttendanceStats(startDate: Date, endDate: Date): Promise<{
    totalClasses: number;
    totalStudents: number;
    attendanceRate: number;
    dateStats: Array<{ date: string; presentCount: number; totalCount: number; rate: number }>;
  }> {
    try {
      const startDateString = format(startDate, 'yyyy-MM-dd');
      const endDateString = format(endDate, 'yyyy-MM-dd');
      
      // Get all attendance records in range
      const q = query(
        collection(db, this.collectionName),
        where('date', '>=', startDateString),
        where('date', '<=', endDateString),
        orderBy('date')
      );
      
      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => doc.data() as AttendanceRecord);
      
      // Group by date
      const dateGroups = records.reduce((acc, record) => {
        if (!acc[record.date]) {
          acc[record.date] = [];
        }
        acc[record.date].push(record);
        return acc;
      }, {} as Record<string, AttendanceRecord[]>);
      
      // Calculate stats
      const dateStats = Object.entries(dateGroups).map(([date, dayRecords]) => {
        const presentCount = dayRecords.filter(r => r.isPresent).length;
        const totalCount = dayRecords.length;
        const rate = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;
        
        return { date, presentCount, totalCount, rate };
      });
      
      const totalClasses = dateStats.length;
      const totalRecords = records.length;
      const totalPresent = records.filter(r => r.isPresent).length;
      const attendanceRate = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;
      
      // Count unique students
      const uniqueStudents = new Set(records.map(r => r.studentAccount));
      
      return {
        totalClasses,
        totalStudents: uniqueStudents.size,
        attendanceRate,
        dateStats
      };
    } catch (error) {
      throw new Error('Không thể tính toán thống kê điểm danh.');
    }
  }

  /**
   * Delete attendance record
   */
  async deleteAttendance(studentAccount: string, date: Date): Promise<void> {
    try {
      const dateString = format(date, 'yyyy-MM-dd');
      const docId = `${studentAccount}_${dateString}`;
      await deleteDoc(doc(db, this.collectionName, docId));
    } catch (error) {
      throw new Error('Không thể xóa điểm danh.');
    }
  }

  /**
   * Get all unique dates that have attendance records
   */
  async getAttendanceDates(): Promise<string[]> {
    try {
      // Simple query without ordering first
      let querySnapshot;
      try {
        querySnapshot = await getDocs(
          query(collection(db, this.collectionName), orderBy('date', 'desc'))
        );
      } catch (orderError) {
        // If ordering fails, try without ordering
        console.warn('Could not order by date, fetching all records:', orderError);
        querySnapshot = await getDocs(collection(db, this.collectionName));
      }
      
      const dates = new Set(querySnapshot.docs.map(doc => doc.data().date as string));
      const sortedDates = Array.from(dates).sort();
      return sortedDates.reverse(); // Most recent first
    } catch (error) {
      console.error('Error getting attendance dates:', error);
      return [];
    }
  }
}

export const attendanceService = new AttendanceService();
