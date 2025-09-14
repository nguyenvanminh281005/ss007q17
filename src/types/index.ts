import type { User } from 'firebase/auth';

// Base interfaces
export interface Student {
  account: string; // MSSV - used as document ID
  name: string;
  surname: string;
  group: string;
}

export interface StudentPermission {
  id?: string;
  studentAccount: string;
  canMarkAttendance: boolean;
  canEditGrades: boolean;
  isGroupLeader: boolean;
  role: 'student' | 'group_leader' | 'teacher';
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface AttendanceRecord {
  id?: string;
  studentAccount: string;
  date: string; // Format: YYYY-MM-DD
  isPresent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GradeRecord {
  id?: string;
  studentAccount: string;
  midterm?: number;
  final?: number;
  assignment1?: number;
  assignment2?: number;
  assignment3?: number;
  project?: number;
  participation?: number;
  total?: number;
  updatedAt: Date;
  updatedBy: string; // Account of who updated
}

// Auth related
export interface AuthUser extends User {
  role: UserRole;
  studentAccount?: string; // For students, this is their MSSV
}

export type UserRole = 'teacher' | 'student' | 'group_leader';

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithAccount: (account: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
}

export type Permission = 'read_all' | 'edit_attendance' | 'edit_grades' | 'read_own';

// UI State interfaces
export interface AttendancePageState {
  selectedDate: Date;
  searchTerm: string;
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  loading: boolean;
}

export interface GradesPageState {
  students: Student[];
  grades: GradeRecord[];
  loading: boolean;
  mode: 'manual' | 'excel';
  selectedGradeType: GradeType;
}

export type GradeType = 'midterm' | 'final' | 'assignment1' | 'assignment2' | 'assignment3' | 'project' | 'participation';

// Excel upload related
export interface ExcelUploadResult {
  success: boolean;
  message: string;
  errors: ExcelValidationError[];
  processedCount: number;
  totalCount: number;
}

export interface ExcelValidationError {
  row: number;
  account: string;
  field: string;
  error: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Filter and search types
export interface StudentFilter {
  searchTerm?: string;
  group?: string;
  hasAttendanceOn?: string;
  hasGrades?: boolean;
}

export interface AttendanceFilter {
  date?: string;
  studentAccount?: string;
  group?: string;
}

// Component props
export interface StudentTableProps {
  students: Student[];
  onStudentSelect?: (student: Student) => void;
  selectable?: boolean;
  loading?: boolean;
}

export interface AttendanceTableProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  selectedDate: Date;
  onAttendanceChange: (studentAccount: string, isPresent: boolean) => void;
  readOnly?: boolean;
  loading?: boolean;
}

export interface GradesTableProps {
  students: Student[];
  grades: GradeRecord[];
  gradeType: GradeType;
  onGradeChange: (studentAccount: string, value: number) => void;
  readOnly?: boolean;
  loading?: boolean;
}
