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
import { db } from './firebase';
import type { GradeRecord, GradeType, ExcelUploadResult, ExcelValidationError } from '../types';

class GradeService {
  private collectionName = 'grades';

  /**
   * Get all grade records
   */
  async getAllGrades(): Promise<GradeRecord[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        orderBy('studentAccount')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as GradeRecord;
      });
    } catch (error) {
      throw new Error('Không thể tải dữ liệu điểm số.');
    }
  }

  /**
   * Get grades for specific student
   */
  async getGradesByStudent(studentAccount: string): Promise<GradeRecord | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('studentAccount', '==', studentAccount)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as GradeRecord;
      }
      
      return null;
    } catch (error) {
      throw new Error('Không thể tải điểm của sinh viên.');
    }
  }

  /**
   * Update single grade for a student
   */
  async updateGrade(
    studentAccount: string, 
    gradeType: GradeType, 
    value: number, 
    updatedBy: string
  ): Promise<void> {
    try {
      const docId = studentAccount;
      
      // Check if record exists
      const existingGrade = await this.getGradesByStudent(studentAccount);
      
      const gradeData = {
        studentAccount,
        [gradeType]: value,
        updatedAt: Timestamp.now(),
        updatedBy
      };

      if (existingGrade) {
        // Update existing record
        await updateDoc(doc(db, this.collectionName, docId), gradeData);
      } else {
        // Create new record
        await setDoc(doc(db, this.collectionName, docId), gradeData);
      }

      // Recalculate total if needed
      await this.recalculateTotal(studentAccount);
    } catch (error) {
      throw new Error('Không thể cập nhật điểm.');
    }
  }

  /**
   * Batch update grades for multiple students
   */
  async batchUpdateGrades(
    grades: Array<{
      studentAccount: string;
      gradeType: GradeType;
      value: number;
    }>,
    updatedBy: string
  ): Promise<void> {
    try {
      const promises = grades.map(({ studentAccount, gradeType, value }) =>
        this.updateGrade(studentAccount, gradeType, value, updatedBy)
      );
      
      await Promise.all(promises);
    } catch (error) {
      throw new Error('Không thể cập nhật điểm hàng loạt.');
    }
  }

  /**
   * Update full grade record for a student
   */
  async updateFullGrade(gradeRecord: Omit<GradeRecord, 'id' | 'updatedAt'>): Promise<void> {
    try {
      const docId = gradeRecord.studentAccount;
      
      const gradeData = {
        ...gradeRecord,
        updatedAt: Timestamp.now(),
        // Calculate total
        total: this.calculateTotal(gradeRecord)
      };

      await setDoc(doc(db, this.collectionName, docId), gradeData);
    } catch (error) {
      throw new Error('Không thể cập nhật điểm.');
    }
  }

  /**
   * Process Excel upload for grades
   */
  async processExcelUpload(
    excelData: Array<Record<string, any>>,
    gradeType: GradeType,
    updatedBy: string
  ): Promise<ExcelUploadResult> {
    const errors: ExcelValidationError[] = [];
    const validGrades: Array<{ studentAccount: string; gradeType: GradeType; value: number }> = [];
    
    try {
      // Validate each row
      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        const rowNumber = i + 2; // Excel rows start from 2 (after header)
        
        // Check required fields
        if (!row.account && !row.MSSV && !row.studentAccount) {
          errors.push({
            row: rowNumber,
            account: 'N/A',
            field: 'account',
            error: 'Thiếu MSSV/Account'
          });
          continue;
        }
        
        const studentAccount = row.account || row.MSSV || row.studentAccount;
        const gradeValue = row[gradeType] || row.grade || row.score;
        
        // Validate grade value
        if (gradeValue === undefined || gradeValue === null || gradeValue === '') {
          errors.push({
            row: rowNumber,
            account: studentAccount,
            field: gradeType,
            error: 'Thiếu điểm'
          });
          continue;
        }
        
        const numericGrade = parseFloat(gradeValue);
        if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > 10) {
          errors.push({
            row: rowNumber,
            account: studentAccount,
            field: gradeType,
            error: 'Điểm không hợp lệ (0-10)'
          });
          continue;
        }
        
        validGrades.push({
          studentAccount: studentAccount.toString(),
          gradeType,
          value: numericGrade
        });
      }
      
      // If no errors, proceed with batch update
      if (errors.length === 0) {
        await this.batchUpdateGrades(validGrades, updatedBy);
      }
      
      return {
        success: errors.length === 0,
        message: errors.length === 0 
          ? `Cập nhật thành công ${validGrades.length} điểm`
          : `Có ${errors.length} lỗi trong file Excel`,
        errors,
        processedCount: validGrades.length,
        totalCount: excelData.length
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Lỗi xử lý file Excel',
        errors: [],
        processedCount: 0,
        totalCount: excelData.length
      };
    }
  }

  /**
   * Calculate total grade based on weights
   */
  private calculateTotal(gradeRecord: Partial<GradeRecord>): number {
    // Define weights (you can make this configurable)
    const weights = {
      midterm: 0.3,
      final: 0.4,
      assignment1: 0.1,
      assignment2: 0.1,
      assignment3: 0.05,
      project: 0.15,
      participation: 0.05
    };
    
    let total = 0;
    let totalWeight = 0;
    
    Object.entries(weights).forEach(([key, weight]) => {
      const grade = gradeRecord[key as keyof GradeRecord] as number;
      if (typeof grade === 'number' && !isNaN(grade)) {
        total += grade * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? Number((total / totalWeight).toFixed(2)) : 0;
  }

  /**
   * Recalculate total grade for a student
   */
  private async recalculateTotal(studentAccount: string): Promise<void> {
    try {
      const gradeRecord = await this.getGradesByStudent(studentAccount);
      if (gradeRecord) {
        const newTotal = this.calculateTotal(gradeRecord);
        await updateDoc(doc(db, this.collectionName, studentAccount), {
          total: newTotal,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.warn('Could not recalculate total for student:', studentAccount, error);
    }
  }

  /**
   * Delete grade record
   */
  async deleteGrade(studentAccount: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, studentAccount));
    } catch (error) {
      throw new Error('Không thể xóa điểm.');
    }
  }

  /**
   * Get grade statistics
   */
  async getGradeStats(gradeType: GradeType): Promise<{
    average: number;
    highest: number;
    lowest: number;
    count: number;
    distribution: Record<string, number>; // Grade ranges
  }> {
    try {
      const grades = await this.getAllGrades();
      const values = grades
        .map(g => g[gradeType] as number)
        .filter(v => typeof v === 'number' && !isNaN(v));
      
      if (values.length === 0) {
        return {
          average: 0,
          highest: 0,
          lowest: 0,
          count: 0,
          distribution: {}
        };
      }
      
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      const highest = Math.max(...values);
      const lowest = Math.min(...values);
      
      // Calculate distribution
      const distribution = {
        'A (8.5-10)': values.filter(v => v >= 8.5).length,
        'B (7.0-8.4)': values.filter(v => v >= 7 && v < 8.5).length,
        'C (5.5-6.9)': values.filter(v => v >= 5.5 && v < 7).length,
        'D (4.0-5.4)': values.filter(v => v >= 4 && v < 5.5).length,
        'F (0-3.9)': values.filter(v => v < 4).length,
      };
      
      return {
        average: Number(average.toFixed(2)),
        highest,
        lowest,
        count: values.length,
        distribution
      };
    } catch (error) {
      throw new Error('Không thể tính toán thống kê điểm.');
    }
  }
}

export const gradeService = new GradeService();
