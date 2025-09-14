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
  Timestamp,
  getDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import type { StudentPermission } from '../types';

class PermissionService {
  private collectionName = 'permissions';

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<StudentPermission[]> {
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
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as StudentPermission;
      });
    } catch (error) {
      console.error('Error getting all permissions:', error);
      return [];
    }
  }

  /**
   * Get permissions for specific student
   */
  async getPermission(studentAccount: string): Promise<StudentPermission | null> {
    try {
      const docRef = doc(db, this.collectionName, studentAccount);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as StudentPermission;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting permission:', error);
      return null;
    }
  }

  /**
   * Create or update permission for student
   */
  async setPermission(permission: Omit<StudentPermission, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, permission.studentAccount);
      const existingDoc = await getDoc(docRef);
      
      const permissionData = {
        ...permission,
        updatedAt: Timestamp.now(),
      };

      if (existingDoc.exists()) {
        // Update existing permission
        await updateDoc(docRef, permissionData);
      } else {
        // Create new permission
        await setDoc(docRef, {
          ...permissionData,
          createdAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Error setting permission:', error);
      throw new Error('Không thể cập nhật quyền hạn.');
    }
  }

  /**
   * Check if student can mark attendance
   */
  async canMarkAttendance(studentAccount: string): Promise<boolean> {
    try {
      const permission = await this.getPermission(studentAccount);
      return permission?.canMarkAttendance || false;
    } catch (error) {
      console.error('Error checking attendance permission:', error);
      return false;
    }
  }

  /**
   * Check if student can edit grades
   */
  async canEditGrades(studentAccount: string): Promise<boolean> {
    try {
      const permission = await this.getPermission(studentAccount);
      return permission?.canEditGrades || false;
    } catch (error) {
      console.error('Error checking grade permission:', error);
      return false;
    }
  }

  /**
   * Bulk create permissions for multiple students
   */
  async bulkSetPermissions(permissions: Array<Omit<StudentPermission, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    try {
      const promises = permissions.map(permission => this.setPermission(permission));
      await Promise.all(promises);
    } catch (error) {
      console.error('Error bulk setting permissions:', error);
      throw new Error('Không thể cập nhật quyền hạn hàng loạt.');
    }
  }

  /**
   * Delete permission for student
   */
  async deletePermission(studentAccount: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, studentAccount));
    } catch (error) {
      console.error('Error deleting permission:', error);
      throw new Error('Không thể xóa quyền hạn.');
    }
  }

  /**
   * Get students with specific permission
   */
  async getStudentsWithPermission(permissionType: keyof Pick<StudentPermission, 'canMarkAttendance' | 'canEditGrades'>): Promise<StudentPermission[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where(permissionType, '==', true),
        orderBy('studentAccount')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as StudentPermission;
      });
    } catch (error) {
      console.error('Error getting students with permission:', error);
      return [];
    }
  }

  /**
   * Initialize default permissions for a student
   */
  async initializeDefaultPermission(studentAccount: string, createdBy: string = 'system'): Promise<void> {
    const defaultPermission: Omit<StudentPermission, 'id' | 'createdAt' | 'updatedAt'> = {
      studentAccount,
      canMarkAttendance: false, // Default: no permission
      canEditGrades: false,
      isGroupLeader: false,
      role: 'student',
      createdBy
    };

    await this.setPermission(defaultPermission);
  }

  /**
   * Set group leader permissions
   */
  async setGroupLeader(studentAccount: string, createdBy: string = 'admin'): Promise<void> {
    const groupLeaderPermission: Omit<StudentPermission, 'id' | 'createdAt' | 'updatedAt'> = {
      studentAccount,
      canMarkAttendance: true,
      canEditGrades: false,
      isGroupLeader: true,
      role: 'group_leader',
      createdBy
    };

    await this.setPermission(groupLeaderPermission);
  }

  /**
   * Set teacher permissions  
   */
  async setTeacher(studentAccount: string, createdBy: string = 'admin'): Promise<void> {
    const teacherPermission: Omit<StudentPermission, 'id' | 'createdAt' | 'updatedAt'> = {
      studentAccount,
      canMarkAttendance: true,
      canEditGrades: true,
      isGroupLeader: false,
      role: 'teacher',
      createdBy
    };

    await this.setPermission(teacherPermission);
  }
}

export const permissionService = new PermissionService();