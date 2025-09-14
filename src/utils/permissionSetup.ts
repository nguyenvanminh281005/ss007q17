import { permissionService } from '../services/permissionService';

/**
 * Utility functions for setting up and managing student permissions
 */

/**
 * Grant attendance marking permission to a student
 */
export const grantAttendancePermission = async (mssv: string, role: 'teacher' | 'group_leader' | 'student' = 'student') => {
  try {
    await permissionService.setPermission({
      studentAccount: mssv,
      canMarkAttendance: true,
      canEditGrades: role === 'teacher',
      isGroupLeader: role === 'group_leader',
      role: role
    });
    console.log(`✅ Granted attendance permission to ${mssv}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to grant permission to ${mssv}:`, error);
    return false;
  }
};

/**
 * Revoke attendance marking permission from a student
 */
export const revokeAttendancePermission = async (mssv: string) => {
  try {
    await permissionService.setPermission({
      studentAccount: mssv,
      canMarkAttendance: false,
      canEditGrades: false,
      isGroupLeader: false,
      role: 'student'
    });
    console.log(`✅ Revoked attendance permission from ${mssv}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to revoke permission from ${mssv}:`, error);
    return false;
  }
};

/**
 * Set up initial permissions for class monitors
 * Call this function in your browser console or create a setup page
 */
export const setupClassMonitors = async (monitorMSSVs: string[]) => {
  console.log('🔧 Setting up class monitors...');
  const results = await Promise.allSettled(
    monitorMSSVs.map(mssv => grantAttendancePermission(mssv, 'group_leader'))
  );
  
  const successful = results.filter(result => result.status === 'fulfilled').length;
  const failed = results.length - successful;
  
  console.log(`✅ Setup complete: ${successful} successful, ${failed} failed`);
  return { successful, failed };
};

/**
 * Set up teacher permissions
 */
export const setupTeacher = async (teacherMSSV: string) => {
  try {
    await permissionService.setPermission({
      studentAccount: teacherMSSV,
      canMarkAttendance: true,
      canEditGrades: true,
      isGroupLeader: false,
      role: 'teacher'
    });
    console.log(`✅ Set up teacher permissions for ${teacherMSSV}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to set up teacher for ${teacherMSSV}:`, error);
    return false;
  }
};

/**
 * Bulk permission setup with different roles
 */
export const bulkSetupPermissions = async (
  teachers: string[] = [],
  monitors: string[] = [],
  regularStudents: string[] = []
) => {
  console.log('🔧 Starting bulk permission setup...');
  
  const teacherPromises = teachers.map(mssv => setupTeacher(mssv));
  const monitorPromises = monitors.map(mssv => grantAttendancePermission(mssv, 'group_leader'));
  const studentPromises = regularStudents.map(mssv => grantAttendancePermission(mssv, 'student'));
  
  const [teacherResults, monitorResults, studentResults] = await Promise.allSettled([
    Promise.allSettled(teacherPromises),
    Promise.allSettled(monitorPromises),
    Promise.allSettled(studentPromises)
  ]);
  
  console.log('✅ Bulk setup complete!');
  console.log(`- Teachers: ${teacherResults.status === 'fulfilled' ? 'Done' : 'Failed'}`);
  console.log(`- Monitors: ${monitorResults.status === 'fulfilled' ? 'Done' : 'Failed'}`);
  console.log(`- Students: ${studentResults.status === 'fulfilled' ? 'Done' : 'Failed'}`);
};

/**
 * Helper function to check all current permissions (for debugging)
 */
export const listAllPermissions = async () => {
  try {
    const permissions = await permissionService.getAllPermissions();
    console.log('📋 Current Permissions:');
    permissions.forEach(permission => {
      console.log(`${permission.id}: ${permission.role} - Attendance: ${permission.canMarkAttendance}, Grades: ${permission.canEditGrades}`);
    });
    return permissions;
  } catch (error) {
    console.error('❌ Failed to list permissions:', error);
    return [];
  }
};

// Example usage in browser console:
/*
import { setupClassMonitors, setupTeacher, listAllPermissions } from './src/utils/permissionSetup';

// Set up teacher
await setupTeacher('22127001');

// Set up class monitors who can mark attendance
await setupClassMonitors(['22127002', '22127003', '22127004']);

// Check current permissions
await listAllPermissions();

// Grant permission to individual student
import { grantAttendancePermission } from './src/utils/permissionSetup';
await grantAttendancePermission('22127005', 'student');
*/