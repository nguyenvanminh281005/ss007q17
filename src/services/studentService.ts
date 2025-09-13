import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import type { Student, StudentFilter } from '../types';

class StudentService {
  private collectionName = 'students';

  /**
   * Get all students
   */
  async getAllStudents(): Promise<Student[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.collectionName));
      return querySnapshot.docs.map(doc => ({
        account: doc.id,
        ...doc.data()
      } as Student));
    } catch (error) {
      throw new Error('Không thể tải danh sách sinh viên.');
    }
  }

  /**
   * Get students with filters
   */
  async getStudents(filter: StudentFilter = {}): Promise<Student[]> {
    try {
      let q;
      
      // Apply filters
      if (filter.group) {
        q = query(
          collection(db, this.collectionName), 
          where('group', '==', filter.group),
          orderBy('surname'), 
          orderBy('name')
        );
      } else {
        q = query(
          collection(db, this.collectionName),
          orderBy('surname'), 
          orderBy('name')
        );
      }
      
      const querySnapshot = await getDocs(q);
      let students = querySnapshot.docs.map(doc => ({
        account: doc.id,
        ...doc.data()
      } as Student));

      // Apply search term filter (client-side for flexibility)
      if (filter.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase();
        students = students.filter(student => 
          student.name.toLowerCase().includes(searchLower) ||
          student.surname.toLowerCase().includes(searchLower) ||
          student.account.toLowerCase().includes(searchLower) ||
          student.group.toLowerCase().includes(searchLower)
        );
      }

      return students;
    } catch (error) {
      throw new Error('Không thể tải danh sách sinh viên.');
    }
  }

  /**
   * Get student by account
   */
  async getStudent(account: string): Promise<Student | null> {
    try {
      const docSnap = await getDocs(query(collection(db, this.collectionName), where('account', '==', account)));
      
      if (!docSnap.empty) {
        const studentDoc = docSnap.docs[0];
        return {
          account: studentDoc.id,
          ...studentDoc.data()
        } as Student;
      }
      
      return null;
    } catch (error) {
      throw new Error('Không thể tải thông tin sinh viên.');
    }
  }

  /**
   * Add new student
   */
  async addStudent(student: Student): Promise<void> {
    try {
      await setDoc(doc(db, this.collectionName, student.account), {
        name: student.name,
        surname: student.surname,
        group: student.group
      });
    } catch (error) {
      throw new Error('Không thể thêm sinh viên.');
    }
  }

  /**
   * Update student
   */
  async updateStudent(account: string, updates: Partial<Student>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, account);
      await updateDoc(docRef, updates);
    } catch (error) {
      throw new Error('Không thể cập nhật thông tin sinh viên.');
    }
  }

  /**
   * Delete student
   */
  async deleteStudent(account: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, account));
    } catch (error) {
      throw new Error('Không thể xóa sinh viên.');
    }
  }

  /**
   * Get unique groups
   */
  async getGroups(): Promise<string[]> {
    try {
      const students = await this.getAllStudents();
      const groups = [...new Set(students.map(s => s.group))];
      return groups.sort();
    } catch (error) {
      throw new Error('Không thể tải danh sách nhóm.');
    }
  }

  /**
   * Search students by term
   */
  async searchStudents(searchTerm: string): Promise<Student[]> {
    return this.getStudents({ searchTerm });
  }
}

export const studentService = new StudentService();
