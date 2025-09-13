import { 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { AuthUser, UserRole } from '../types';

class AuthService {
  private googleProvider = new GoogleAuthProvider();

  /**
   * Login with email and password (for teachers)
   */
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return await this.enrichUserWithRole(result.user);
    } catch (error) {
      throw new Error('Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.');
    }
  }

  /**
   * Login with Google
   */
  async signInWithGoogle(): Promise<AuthUser> {
    try {
      const result = await signInWithPopup(auth, this.googleProvider);
      return await this.enrichUserWithRole(result.user);
    } catch (error) {
      throw new Error('Đăng nhập Google thất bại.');
    }
  }

  /**
   * Login with student account (MSSV) - passwordless
   */
  async signInWithAccount(account: string): Promise<AuthUser> {
    try {
      console.log('Attempting to login with account:', account);
      
      // Check if student exists in database
      const studentDoc = await getDoc(doc(db, 'students', account));
      
      console.log('Student doc exists:', studentDoc.exists());
      
      if (!studentDoc.exists()) {
        // For demo purposes, create a fallback user if student doesn't exist in DB
        // In production, you should ensure all students are properly uploaded
        console.warn(`Student ${account} not found in database, creating demo user`);
        
        const mockUser = {
          uid: account,
          email: `${account}@gm.uit.edu.vn`,
          displayName: `Sinh viên ${account}`,
          emailVerified: true,
          isAnonymous: false,
          phoneNumber: null,
          photoURL: null,
          providerId: 'custom',
          metadata: {
            creationTime: new Date().toISOString(),
            lastSignInTime: new Date().toISOString(),
          },
          providerData: [],
          refreshToken: '',
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => '',
          getIdTokenResult: async () => ({} as any),
          reload: async () => {},
          toJSON: () => ({})
        } as unknown as User;

        return {
          ...mockUser,
          role: 'student' as UserRole,
          studentAccount: account
        };
      }

      // Student exists in database
      const studentData = studentDoc.data();
      console.log('Student data:', studentData);
      
      const mockUser = {
        uid: account,
        email: `${account}@gm.uit.edu.vn`,
        displayName: `${studentData.name} ${studentData.surname}`,
        emailVerified: true,
        isAnonymous: false,
        phoneNumber: null,
        photoURL: null,
        providerId: 'custom',
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
        },
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => '',
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({})
      } as unknown as User;

      return {
        ...mockUser,
        role: 'student' as UserRole,
        studentAccount: account
      };
    } catch (error) {
      console.error('Login error:', error);
      
      // If Firebase error, still allow demo login
      if ((error as any)?.code?.includes('permission') || (error as any)?.message?.includes('permission')) {
        console.warn('Firebase permission error, allowing demo login');
        
        const mockUser = {
          uid: account,
          email: `${account}@gm.uit.edu.vn`,
          displayName: `Demo User ${account}`,
          emailVerified: true,
          isAnonymous: false,
          phoneNumber: null,
          photoURL: null,
          providerId: 'custom',
          metadata: {
            creationTime: new Date().toISOString(),
            lastSignInTime: new Date().toISOString(),
          },
          providerData: [],
          refreshToken: '',
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => '',
          getIdTokenResult: async () => ({} as any),
          reload: async () => {},
          toJSON: () => ({})
        } as unknown as User;

        return {
          ...mockUser,
          role: 'student' as UserRole,
          studentAccount: account
        };
      }
      
      throw new Error(`Đăng nhập thất bại: ${(error as Error).message}`);
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      throw new Error('Đăng xuất thất bại.');
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const enrichedUser = await this.enrichUserWithRole(user);
          callback(enrichedUser);
        } catch (error) {
          console.error('Error enriching user:', error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }

  /**
   * Enrich Firebase User with role information
   */
  private async enrichUserWithRole(user: User): Promise<AuthUser> {
    let role: UserRole = 'student';
    let studentAccount: string | undefined;

    // Check if user is a teacher (has specific email domain or is in teachers collection)
    if (user.email?.includes('@teacher') || user.email?.includes('@admin')) {
      role = 'teacher';
    } else if (user.email?.includes('@student') || user.uid.match(/^\d+$/)) {
      // Student login - either email contains @student or uid is numeric (MSSV)
      role = 'student';
      studentAccount = user.uid;
      
      // Check if student is a group leader
      try {
        const studentDoc = await getDoc(doc(db, 'students', user.uid));
        if (studentDoc.exists() && studentDoc.data().isGroupLeader) {
          role = 'group_leader';
        }
      } catch (error) {
        console.warn('Could not check group leader status:', error);
      }
    }

    return {
      ...user,
      role,
      studentAccount
    };
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(user: AuthUser | null, permission: string): boolean {
    if (!user) return false;

    switch (permission) {
      case 'read_all':
        return user.role === 'teacher' || user.role === 'group_leader';
      case 'edit_attendance':
        return user.role === 'teacher' || user.role === 'group_leader';
      case 'edit_grades':
        return user.role === 'teacher';
      case 'read_own':
        return true; // All authenticated users can read their own data
      default:
        return false;
    }
  }
}

export const authService = new AuthService();
