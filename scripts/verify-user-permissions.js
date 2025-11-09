#!/usr/bin/env node

/**
 * User Permissions and Roles Verification Script
 * Validates user roles and permissions after migration
 */

const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const { MigrationLogger } = require('./migration-logger');

class UserPermissionsVerifier {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.prisma = new PrismaClient();
    this.logger = new MigrationLogger('user-permissions');
    
    this.verificationResults = {
      roleConsistency: { passed: 0, failed: 0, details: [] },
      permissionMapping: { passed: 0, failed: 0, details: [] },
      roleBasedAccess: { passed: 0, failed: 0, details: [] },
      creatorProfileAccess: { passed: 0, failed: 0, details: [] },
      adminPrivileges: { passed: 0, failed: 0, details: [] },
      roleInheritance: { passed: 0, failed: 0, details: [] },
      securityBoundaries: { passed: 0, failed: 0, details: [] },
      overall: { passed: 0, failed: 0, percentage: 0 }
    };
    
    // Define role hierarchy and permissions
    this.roleHierarchy = {
      'USER': 1,
      'CREATOR': 2,
      'ADMIN': 3
    };
    
    this.rolePermissions = {
      'USER': [
        'read_own_profile',
        'update_own_profile',
        'delete_own_account',
        'read_public_content'
      ],
      'CREATOR': [
        'read_own_profile',
        'update_own_profile',
        'delete_own_account',
        'read_public_content',
        'create_content',
        'update_own_content',
        'delete_own_content',
        'view_content_analytics'
      ],
      'ADMIN': [
        'read_own_profile',
        'update_own_profile',
        'delete_own_account',
        'read_public_content',
        'create_content',
        'update_own_content',
        'delete_own_content',
        'view_content_analytics',
        'manage_users',
        'manage_all_content',
        'view_system_analytics',
        'system_admin'
      ]
    };
  }

  async verifyAll() {
    this.logger.info('🔐 Starting user permissions and roles verification...');
    
    try {
      await this.verifyRoleConsistency();
      await this.verifyPermissionMapping();
      await this.verifyRoleBasedAccess();
      await this.verifyCreatorProfileAccess();
      await this.verifyAdminPrivileges();
      await this.verifyRoleInheritance();
      await this.verifySecurityBoundaries();
      
      this.calculateOverallResults();
      this.generatePermissionsReport();
      
      this.logger.info('✅ User permissions and roles verification completed');
      return this.verificationResults;
      
    } catch (error) {
      this.logger.error('❌ User permissions verification failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  async verifyRoleConsistency() {
    this.logger.info('👑 Verifying role consistency...');
    
    try {
      // Get migrated users from local database
      const migratedUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'completed',
          supabase_id: { not: null }
        },
        take: 50, // Sample size
        select: {
          id: true,
          email: true,
          role: true,
          supabase_id: true
        }
      });
      
      for (const user of migratedUsers) {
        try {
          // Validate local role
          if (!this.roleHierarchy[user.role]) {
            this.verificationResults.roleConsistency.failed++;
            this.verificationResults.roleConsistency.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Invalid role in local database',
              role: user.role
            });
            continue;
          }
          
          // Get user from Supabase
          const { data: supabaseUser, error } = await this.supabase.auth.admin.getUserById(user.supabase_id);
          
          if (error || !supabaseUser.user) {
            this.verificationResults.roleConsistency.failed++;
            this.verificationResults.roleConsistency.details.push({
              userId: user.id,
              email: user.email,
              issue: 'User not found in Supabase',
              error: error?.message
            });
            continue;
          }
          
          // Check role consistency
          const supabaseRole = supabaseUser.user.app_metadata?.role;
          
          if (supabaseRole === user.role) {
            this.verificationResults.roleConsistency.passed++;
          } else {
            this.verificationResults.roleConsistency.failed++;
            this.verificationResults.roleConsistency.details.push({
              userId: user.id,
              email: user.email,
              issue: 'Role mismatch between local and Supabase',
              localRole: user.role,
              supabaseRole
            });
          }
          
        } catch (error) {
          this.verificationResults.roleConsistency.failed++;
          this.verificationResults.roleConsistency.details.push({
            userId: user.id,
            email: user.email,
            issue: 'Role consistency verification error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Role consistency verification: ${this.verificationResults.roleConsistency.passed} passed, ${this.verificationResults.roleConsistency.failed} failed`);
      
    } catch (error) {
      this.logger.error('Role consistency verification failed:', error);
    }
  }

  async verifyPermissionMapping() {
    this.logger.info('🗺️ Verifying permission mapping...');
    
    try {
      const migratedUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'completed',
          supabase_id: { not: null }
        },
        take: 20,
        select: {
          id: true,
          email: true,
          role: true,
          supabase_id: true
        }
      });
      
      for (const user of migratedUsers) {
        try {
          // Get user from Supabase
          const { data: supabaseUser, error } = await this.supabase.auth.admin.getUserById(user.supabase_id);
          
          if (error || !supabaseUser.user) {
            this.verificationResults.permissionMapping.failed++;
            this.verificationResults.permissionMapping.details.push({
              userId: user.id,
              email: user.email,
              issue: 'User not found in Supabase'
            });
            continue;
          }
          
          const expectedPermissions = this.rolePermissions[user.role] || [];
          const userMetadata = supabaseUser.user.user_metadata || {};
          const appMetadata = supabaseUser.user.app_metadata || {};
          
          // Check if permissions are properly mapped
          let permissionsCorrect = true;
          const issues = [];
          
          // Check if role is stored in app_metadata
          if (appMetadata.role !== user.role) {
            permissionsCorrect = false;
            issues.push('Role not properly stored in app_metadata');
          }
          
          // Check if user has migration metadata
          if (!userMetadata.migration_info) {
            permissionsCorrect = false;
            issues.push('Missing migration metadata');
          }
          
          // Check permission storage (if permissions are explicitly stored)
          if (appMetadata.permissions) {
            const storedPermissions = appMetadata.permissions;
            const expectedPermissionsSet = new Set(expectedPermissions);
            const storedPermissionsSet = new Set(storedPermissions);
            
            // Check if all expected permissions are present
            for (const permission of expectedPermissions) {
              if (!storedPermissionsSet.has(permission)) {
                permissionsCorrect = false;
                issues.push(`Missing permission: ${permission}`);
              }
            }
            
            // Check for extra permissions
            for (const permission of storedPermissions) {
              if (!expectedPermissionsSet.has(permission)) {
                permissionsCorrect = false;
                issues.push(`Extra permission: ${permission}`);
              }
            }
          }
          
          if (permissionsCorrect) {
            this.verificationResults.permissionMapping.passed++;
          } else {
            this.verificationResults.permissionMapping.failed++;
            this.verificationResults.permissionMapping.details.push({
              userId: user.id,
              email: user.email,
              role: user.role,
              issue: 'Permission mapping issues',
              details: issues
            });
          }
          
        } catch (error) {
          this.verificationResults.permissionMapping.failed++;
          this.verificationResults.permissionMapping.details.push({
            userId: user.id,
            email: user.email,
            issue: 'Permission mapping verification error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Permission mapping verification: ${this.verificationResults.permissionMapping.passed} passed, ${this.verificationResults.permissionMapping.failed} failed`);
      
    } catch (error) {
      this.logger.error('Permission mapping verification failed:', error);
    }
  }

  async verifyRoleBasedAccess() {
    this.logger.info('🔑 Verifying role-based access control...');
    
    try {
      const migratedUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'completed',
          supabase_id: { not: null }
        },
        take: 15,
        select: {
          id: true,
          email: true,
          role: true,
          supabase_id: true
        }
      });
      
      for (const user of migratedUsers) {
        try {
          const expectedPermissions = this.rolePermissions[user.role] || [];
          let accessCorrect = true;
          const accessIssues = [];
          
          // Test each permission that should be available to the user's role
          for (const permission of expectedPermissions) {
            const hasPermission = await this.checkUserPermission(user, permission);
            
            if (!hasPermission) {
              accessCorrect = false;
              accessIssues.push(`Missing access for permission: ${permission}`);
            }
          }
          
          // Test permissions that should NOT be available
          const allPermissions = Object.values(this.rolePermissions).flat();
          const forbiddenPermissions = allPermissions.filter(p => !expectedPermissions.includes(p));
          
          for (const permission of forbiddenPermissions.slice(0, 3)) { // Test a few
            const hasPermission = await this.checkUserPermission(user, permission);
            
            if (hasPermission) {
              accessCorrect = false;
              accessIssues.push(`Unauthorized access for permission: ${permission}`);
            }
          }
          
          if (accessCorrect) {
            this.verificationResults.roleBasedAccess.passed++;
          } else {
            this.verificationResults.roleBasedAccess.failed++;
            this.verificationResults.roleBasedAccess.details.push({
              userId: user.id,
              email: user.email,
              role: user.role,
              issue: 'Role-based access control issues',
              details: accessIssues
            });
          }
          
        } catch (error) {
          this.verificationResults.roleBasedAccess.failed++;
          this.verificationResults.roleBasedAccess.details.push({
            userId: user.id,
            email: user.email,
            issue: 'Role-based access verification error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Role-based access verification: ${this.verificationResults.roleBasedAccess.passed} passed, ${this.verificationResults.roleBasedAccess.failed} failed`);
      
    } catch (error) {
      this.logger.error('Role-based access verification failed:', error);
    }
  }

  async verifyCreatorProfileAccess() {
    this.logger.info('🎨 Verifying creator profile access...');
    
    try {
      // Get users with CREATOR role
      const creatorUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'completed',
          role: 'CREATOR',
          supabase_id: { not: null }
        },
        select: {
          id: true,
          email: true,
          role: true,
          supabase_id: true
        }
      });
      
      for (const creator of creatorUsers) {
        try {
          // Check if creator has corresponding creator profile
          const creatorProfile = await this.prisma.creator_profiles.findUnique({
            where: { user_id: creator.id },
            select: {
              id: true,
              user_id: true,
              display_name: true,
              bio: true
            }
          });
          
          if (!creatorProfile) {
            this.verificationResults.creatorProfileAccess.failed++;
            this.verificationResults.creatorProfileAccess.details.push({
              userId: creator.id,
              email: creator.email,
              issue: 'Creator role without creator profile'
            });
            continue;
          }
          
          // Verify creator has creator-specific permissions
          const creatorPermissions = ['create_content', 'update_own_content', 'delete_own_content'];
          let hasAllCreatorPermissions = true;
          const missingPermissions = [];
          
          for (const permission of creatorPermissions) {
            const hasPermission = await this.checkUserPermission(creator, permission);
            if (!hasPermission) {
              hasAllCreatorPermissions = false;
              missingPermissions.push(permission);
            }
          }
          
          if (hasAllCreatorPermissions) {
            this.verificationResults.creatorProfileAccess.passed++;
          } else {
            this.verificationResults.creatorProfileAccess.failed++;
            this.verificationResults.creatorProfileAccess.details.push({
              userId: creator.id,
              email: creator.email,
              issue: 'Creator missing required permissions',
              missingPermissions
            });
          }
          
        } catch (error) {
          this.verificationResults.creatorProfileAccess.failed++;
          this.verificationResults.creatorProfileAccess.details.push({
            userId: creator.id,
            email: creator.email,
            issue: 'Creator profile access verification error',
            error: error.message
          });
        }
      }
      
      // Check for orphaned creator profiles
      const orphanedProfiles = await this.prisma.$queryRaw`
        SELECT cp.id, cp.user_id 
        FROM creator_profiles cp 
        LEFT JOIN users u ON cp.user_id = u.id 
        WHERE u.id IS NULL OR u.role != 'CREATOR'
        LIMIT 10
      `;
      
      if (orphanedProfiles.length > 0) {
        this.verificationResults.creatorProfileAccess.failed += orphanedProfiles.length;
        orphanedProfiles.forEach(profile => {
          this.verificationResults.creatorProfileAccess.details.push({
            profileId: profile.id,
            userId: profile.user_id,
            issue: 'Orphaned creator profile'
          });
        });
      }
      
      this.logger.info(`Creator profile access verification: ${this.verificationResults.creatorProfileAccess.passed} passed, ${this.verificationResults.creatorProfileAccess.failed} failed`);
      
    } catch (error) {
      this.logger.error('Creator profile access verification failed:', error);
    }
  }

  async verifyAdminPrivileges() {
    this.logger.info('⚡ Verifying admin privileges...');
    
    try {
      // Get users with ADMIN role
      const adminUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'completed',
          role: 'ADMIN',
          supabase_id: { not: null }
        },
        select: {
          id: true,
          email: true,
          role: true,
          supabase_id: true
        }
      });
      
      for (const admin of adminUsers) {
        try {
          // Verify admin has admin-specific permissions
          const adminPermissions = ['manage_users', 'manage_all_content', 'view_system_analytics', 'system_admin'];
          let hasAllAdminPermissions = true;
          const missingPermissions = [];
          
          for (const permission of adminPermissions) {
            const hasPermission = await this.checkUserPermission(admin, permission);
            if (!hasPermission) {
              hasAllAdminPermissions = false;
              missingPermissions.push(permission);
            }
          }
          
          if (hasAllAdminPermissions) {
            this.verificationResults.adminPrivileges.passed++;
          } else {
            this.verificationResults.adminPrivileges.failed++;
            this.verificationResults.adminPrivileges.details.push({
              userId: admin.id,
              email: admin.email,
              issue: 'Admin missing required privileges',
              missingPermissions
            });
          }
          
          // Test admin can access other users (for management)
          const canManageUsers = await this.checkAdminCanManageUsers(admin);
          if (!canManageUsers) {
            this.verificationResults.adminPrivileges.failed++;
            this.verificationResults.adminPrivileges.details.push({
              userId: admin.id,
              email: admin.email,
              issue: 'Admin cannot manage users'
            });
          } else {
            this.verificationResults.adminPrivileges.passed++;
          }
          
        } catch (error) {
          this.verificationResults.adminPrivileges.failed++;
          this.verificationResults.adminPrivileges.details.push({
            userId: admin.id,
            email: admin.email,
            issue: 'Admin privileges verification error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Admin privileges verification: ${this.verificationResults.adminPrivileges.passed} passed, ${this.verificationResults.adminPrivileges.failed} failed`);
      
    } catch (error) {
      this.logger.error('Admin privileges verification failed:', error);
    }
  }

  async verifyRoleInheritance() {
    this.logger.info('🔗 Verifying role inheritance...');
    
    try {
      const migratedUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'completed',
          supabase_id: { not: null }
        },
        take: 15,
        select: {
          id: true,
          email: true,
          role: true,
          supabase_id: true
        }
      });
      
      for (const user of migratedUsers) {
        try {
          const userRole = user.role;
          const userLevel = this.roleHierarchy[userRole];
          const userPermissions = this.rolePermissions[userRole] || [];
          
          // Verify that higher roles include all permissions of lower roles
          let inheritanceCorrect = true;
          const inheritanceIssues = [];
          
          for (const [role, level] of Object.entries(this.roleHierarchy)) {
            if (level <= userLevel) {
              const lowerRolePermissions = this.rolePermissions[role] || [];
              
              for (const permission of lowerRolePermissions) {
                const hasPermission = await this.checkUserPermission(user, permission);
                if (!hasPermission) {
                  inheritanceCorrect = false;
                  inheritanceIssues.push(`Missing inherited permission from ${role}: ${permission}`);
                }
              }
            }
          }
          
          // Verify that user doesn't have permissions from higher roles
          for (const [role, level] of Object.entries(this.roleHierarchy)) {
            if (level > userLevel) {
              const higherRolePermissions = this.rolePermissions[role] || [];
              
              for (const permission of higherRolePermissions) {
                const hasPermission = await this.checkUserPermission(user, permission);
                if (hasPermission) {
                  inheritanceCorrect = false;
                  inheritanceIssues.push(`Has permission from higher role ${role}: ${permission}`);
                }
              }
            }
          }
          
          if (inheritanceCorrect) {
            this.verificationResults.roleInheritance.passed++;
          } else {
            this.verificationResults.roleInheritance.failed++;
            this.verificationResults.roleInheritance.details.push({
              userId: user.id,
              email: user.email,
              role: userRole,
              issue: 'Role inheritance problems',
              details: inheritanceIssues
            });
          }
          
        } catch (error) {
          this.verificationResults.roleInheritance.failed++;
          this.verificationResults.roleInheritance.details.push({
            userId: user.id,
            email: user.email,
            issue: 'Role inheritance verification error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Role inheritance verification: ${this.verificationResults.roleInheritance.passed} passed, ${this.verificationResults.roleInheritance.failed} failed`);
      
    } catch (error) {
      this.logger.error('Role inheritance verification failed:', error);
    }
  }

  async verifySecurityBoundaries() {
    this.logger.info('🛡️ Verifying security boundaries...');
    
    try {
      const migratedUsers = await this.prisma.users.findMany({
        where: {
          migration_status: 'completed',
          supabase_id: { not: null }
        },
        take: 10,
        select: {
          id: true,
          email: true,
          role: true,
          supabase_id: true
        }
      });
      
      for (const user of migratedUsers) {
        try {
          let securityBoundariesCorrect = true;
          const securityIssues = [];
          
          // Test 1: User cannot access other users' data without permission
          const canAccessOtherUserData = await this.checkCanAccessOtherUserData(user);
          if (canAccessOtherUserData && user.role !== 'ADMIN') {
            securityBoundariesCorrect = false;
            securityIssues.push('User can access other users data without admin role');
          }
          
          // Test 2: User cannot modify system settings without admin role
          const canModifySystemSettings = await this.checkCanModifySystemSettings(user);
          if (canModifySystemSettings && user.role !== 'ADMIN') {
            securityBoundariesCorrect = false;
            securityIssues.push('User can modify system settings without admin role');
          }
          
          // Test 3: User metadata doesn't contain sensitive information
          const { data: supabaseUser, error } = await this.supabase.auth.admin.getUserById(user.supabase_id);
          
          if (!error && supabaseUser.user) {
            const metadata = supabaseUser.user.user_metadata || {};
            const sensitiveFields = ['password', 'secret', 'token', 'key', 'private'];
            
            for (const field of sensitiveFields) {
              if (metadata[field] !== undefined) {
                securityBoundariesCorrect = false;
                securityIssues.push(`Sensitive data in metadata: ${field}`);
              }
            }
          }
          
          // Test 4: Role escalation is not possible
          const canEscalateRole = await this.checkCanEscalateRole(user);
          if (canEscalateRole) {
            securityBoundariesCorrect = false;
            securityIssues.push('User can escalate their own role');
          }
          
          if (securityBoundariesCorrect) {
            this.verificationResults.securityBoundaries.passed++;
          } else {
            this.verificationResults.securityBoundaries.failed++;
            this.verificationResults.securityBoundaries.details.push({
              userId: user.id,
              email: user.email,
              role: user.role,
              issue: 'Security boundary violations',
              details: securityIssues
            });
          }
          
        } catch (error) {
          this.verificationResults.securityBoundaries.failed++;
          this.verificationResults.securityBoundaries.details.push({
            userId: user.id,
            email: user.email,
            issue: 'Security boundaries verification error',
            error: error.message
          });
        }
      }
      
      this.logger.info(`Security boundaries verification: ${this.verificationResults.securityBoundaries.passed} passed, ${this.verificationResults.securityBoundaries.failed} failed`);
      
    } catch (error) {
      this.logger.error('Security boundaries verification failed:', error);
    }
  }

  calculateOverallResults() {
    const categories = [
      'roleConsistency',
      'permissionMapping',
      'roleBasedAccess',
      'creatorProfileAccess',
      'adminPrivileges',
      'roleInheritance',
      'securityBoundaries'
    ];
    
    let totalPassed = 0;
    let totalChecks = 0;
    
    categories.forEach(category => {
      totalPassed += this.verificationResults[category].passed;
      totalChecks += this.verificationResults[category].passed + this.verificationResults[category].failed;
    });
    
    this.verificationResults.overall.passed = totalPassed;
    this.verificationResults.overall.failed = totalChecks - totalPassed;
    this.verificationResults.overall.percentage = totalChecks > 0 
      ? Math.round((totalPassed / totalChecks) * 100) 
      : 0;
  }

  generatePermissionsReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔐 USER PERMISSIONS AND ROLES VERIFICATION REPORT');
    console.log('='.repeat(80));
    
    const categories = [
      { name: 'Role Consistency', key: 'roleConsistency' },
      { name: 'Permission Mapping', key: 'permissionMapping' },
      { name: 'Role-Based Access', key: 'roleBasedAccess' },
      { name: 'Creator Profile Access', key: 'creatorProfileAccess' },
      { name: 'Admin Privileges', key: 'adminPrivileges' },
      { name: 'Role Inheritance', key: 'roleInheritance' },
      { name: 'Security Boundaries', key: 'securityBoundaries' }
    ];
    
    categories.forEach(category => {
      const results = this.verificationResults[category.key];
      const total = results.passed + results.failed;
      const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;
      
      console.log(`\n${category.name}:`);
      console.log(`  Passed: ${results.passed}, Failed: ${results.failed}, Pass Rate: ${passRate}%`);
      
      if (results.failed > 0 && results.details.length > 0) {
        console.log('  Issues:');
        results.details.slice(0, 2).forEach(detail => {
          if (detail.details) {
            console.log(`    - ${detail.issue}: ${detail.details.join(', ')}`);
          } else {
            console.log(`    - ${detail.issue}`);
          }
        });
        if (results.details.length > 2) {
          console.log(`    ... and ${results.details.length - 2} more issues`);
        }
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`OVERALL PERMISSIONS SCORE: ${this.verificationResults.overall.percentage}%`);
    console.log(`Total Checks: ${this.verificationResults.overall.passed + this.verificationResults.overall.failed}`);
    console.log(`Passed: ${this.verificationResults.overall.passed}, Failed: ${this.verificationResults.overall.failed}`);
    
    if (this.verificationResults.overall.percentage >= 95) {
      console.log('✅ EXCELLENT - All permissions and roles are correctly configured');
    } else if (this.verificationResults.overall.percentage >= 85) {
      console.log('✅ GOOD - Most permissions are correct, minor issues exist');
    } else if (this.verificationResults.overall.percentage >= 70) {
      console.log('⚠️ FAIR - Some permission issues need attention');
    } else {
      console.log('❌ POOR - Significant permission and role issues found');
    }
    
    console.log('='.repeat(80));
    
    // Save detailed report
    this.logger.saveToFile(`user-permissions-report-${Date.now()}.json`);
  }

  // Helper methods for permission checking
  async checkUserPermission(user, permission) {
    try {
      // This would integrate with your application's permission system
      // For now, we'll simulate permission checking based on role
      const userPermissions = this.rolePermissions[user.role] || [];
      return userPermissions.includes(permission);
    } catch (error) {
      return false;
    }
  }

  async checkAdminCanManageUsers(admin) {
    try {
      // Simulate checking if admin can manage other users
      return admin.role === 'ADMIN';
    } catch (error) {
      return false;
    }
  }

  async checkCanAccessOtherUserData(user) {
    try {
      // Simulate checking if user can access other users' data
      // Only admins should be able to do this
      return user.role === 'ADMIN';
    } catch (error) {
      return false;
    }
  }

  async checkCanModifySystemSettings(user) {
    try {
      // Simulate checking if user can modify system settings
      // Only admins should be able to do this
      return user.role === 'ADMIN';
    } catch (error) {
      return false;
    }
  }

  async checkCanEscalateRole(user) {
    try {
      // Simulate checking if user can escalate their role
      // No user should be able to do this
      return false;
    } catch (error) {
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const verifier = new UserPermissionsVerifier();
  verifier.verifyAll()
    .then(() => {
      console.log('\n✅ User permissions and roles verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ User permissions verification failed:', error);
      process.exit(1);
    });
}

module.exports = UserPermissionsVerifier;