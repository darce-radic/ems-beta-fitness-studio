import {
  users,
  type User,
  type InsertUser,
  userNotifications,
  pushSubscriptions,
  notificationPreferences,
  achievements,
  userAchievements,
  homeUserOnboarding,
  homeUserPostureAssessment,
  userSafetyVideoLogs,
  type Achievement,
  type UserAchievement,
  type HomeUserOnboarding,
  type HomeUserPostureAssessment,
  type InsertHomeUserPostureAssessment,
  type InsertUserSafetyVideoLog,
  OnboardingStepStatus,
  emsSessions,
  emsEquipment,
  emsClientProgress,
  emsSessionResults,
  locations,
  membershipTypes,
  type MembershipType
} from "@shared/schema";
import {
  achievementProgress,
  type AchievementProgress
} from "@shared/achievements";
import { db } from "./db";
import { eq, and, desc, count, gte, lte } from "drizzle-orm";
import { systemSettings } from "@shared/admin-schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(roleFilter?: string): Promise<User[]>;
  createUser(userData: Omit<InsertUser, "id">): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User>;
  
  // Membership operations
  getMembershipTypes(): Promise<MembershipType[]>;
  getMembershipType(id: number): Promise<MembershipType | undefined>;
  
  // Notification operations
  saveNotificationSubscription(userId: number, subscription: { endpoint: string, keys: { p256dh: string, auth: string } }): Promise<void>;
  removeNotificationSubscription(userId: number, endpoint: string): Promise<void>;
  getUserNotificationSubscriptions(userId: number): Promise<{ endpoint: string, keys: { p256dh: string, auth: string } }[]>;
  updateNotificationPreferences(userId: number, preferences: Record<string, boolean>): Promise<void>;
  getNotificationPreferences(userId: number): Promise<Record<string, boolean> | null>;
  createNotification(data: { userId: number, type: string, title: string, body: string, actionUrl?: string, data?: any }): Promise<any>;
  getNotificationHistory(userId: number): Promise<any[]>;
  markNotificationAsRead(userId: number, notificationId: string): Promise<void>;
  
  // System settings operations (admin-only)
  getSystemSettings(key: string): Promise<any>;
  updateSystemSettings(key: string, data: any): Promise<any>;
  
  // Achievement operations
  getAllAchievements(): Promise<any[]>;
  getUserAchievements(userId: number): Promise<any[]>;
  getUserAchievementProgress(userId: number): Promise<any[]>;
  getAchievementLeaderboard(limit: number): Promise<any[]>;
  awardAchievement(userId: number, achievementId: number): Promise<void>;
  
  // Home EMS User Onboarding operations
  getHomeUserOnboardingStatus(userId: number): Promise<HomeUserOnboarding | undefined>;
  createHomeUserOnboardingStatus(userId: number): Promise<HomeUserOnboarding>;
  updateHomeUserParqStatus(userId: number, status: string, completedAt?: Date): Promise<HomeUserOnboarding>;
  updateHomeUserPostureStatus(userId: number, status: string, completedAt?: Date): Promise<HomeUserOnboarding>;
  updateHomeUserSafetyVideoStatus(userId: number, status: string, completedAt?: Date): Promise<HomeUserOnboarding>;
  updateHomeUserEligibility(userId: number, isEligible: boolean): Promise<HomeUserOnboarding>;
  
  // Home EMS User Posture Assessment operations
  getHomeUserPostureAssessment(userId: number): Promise<HomeUserPostureAssessment | undefined>;
  updateHomeUserPostureAssessment(userId: number, data: Partial<InsertHomeUserPostureAssessment>): Promise<HomeUserPostureAssessment>;
  
  // Home EMS User Safety Video operations
  logSafetyVideoProgress(userId: number, data: Omit<InsertUserSafetyVideoLog, "userId">): Promise<void>;
  getSafetyVideoProgress(userId: number, videoId: string): Promise<any>;
  
  // EMS Sessions operations
  getEmsSessions(userId: number): Promise<any[]>;
  getEmsSessionById(sessionId: number): Promise<any | undefined>;
  createEmsSession(data: any): Promise<any>;
  updateEmsSession(sessionId: number, data: any): Promise<any>;
  deleteEmsSession(sessionId: number): Promise<void>;
  getEmsSessionsCount(userId: number): Promise<number>;
  getEmsSessionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<any[]>;
  getEmsSessionsSummary(userId: number): Promise<any>;
  
  // EMS Progress operations
  getEmsProgress(userId: number): Promise<any[]>;
  createEmsProgress(data: any): Promise<any>;
  
  // EMS Equipment operations
  getEmsEquipment(userId: number): Promise<any | undefined>;
  createEmsEquipment(data: any): Promise<any>;
  updateEmsEquipment(equipmentId: number, data: any): Promise<any>;
  
  // EMS Settings operations
  getEmsSettings(userId: number): Promise<any | undefined>;
  createEmsSettings(data: any): Promise<any>;
  updateEmsSettings(userId: number, data: any): Promise<any>;
  
  // Locations operations
  getAllLocations(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getAllUsers(roleFilter?: string): Promise<User[]> {
    if (roleFilter) {
      return await db.select().from(users).where(eq(users.role, roleFilter));
    }
    return await db.select().from(users);
  }
  
  async createUser(userData: Omit<InsertUser, "id">): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  // Implement all your existing methods from storage.ts here
  // ...

  // System settings operations (admin-only)
  async getSystemSettings(key: string): Promise<any> {
    try {
      const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
      return setting?.value || null;
    } catch (error) {
      console.error(`Error retrieving system settings for key ${key}:`, error);
      return null;
    }
  }
  
  async updateSystemSettings(key: string, data: any): Promise<any> {
    try {
      // Check if the setting already exists
      const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
      
      if (existing) {
        // Update existing setting
        const [updated] = await db
          .update(systemSettings)
          .set({ 
            value: data,
            updatedAt: new Date()
          })
          .where(eq(systemSettings.key, key))
          .returning();
        return updated.value;
      } else {
        // Create new setting
        const [created] = await db
          .insert(systemSettings)
          .values({
            key,
            value: data,
            updatedAt: new Date()
          })
          .returning();
        return created.value;
      }
    } catch (error: any) {
      console.error(`Error updating system settings for key ${key}:`, error);
      throw new Error(`Failed to update system settings: ${error.message}`);
    }
  }
  
  // Implement other required methods from IStorage
  async saveNotificationSubscription(userId: number, subscription: { endpoint: string, keys: { p256dh: string, auth: string } }): Promise<void> {
    // Implementation
  }
  
  async removeNotificationSubscription(userId: number, endpoint: string): Promise<void> {
    // Implementation
  }
  
  async getUserNotificationSubscriptions(userId: number): Promise<{ endpoint: string, keys: { p256dh: string, auth: string } }[]> {
    // Implementation
    return [];
  }
  
  async updateNotificationPreferences(userId: number, preferences: Record<string, boolean>): Promise<void> {
    // Implementation
  }
  
  async getNotificationPreferences(userId: number): Promise<Record<string, boolean> | null> {
    // Implementation
    return null;
  }
  
  async createNotification(data: { userId: number, type: string, title: string, body: string, actionUrl?: string, data?: any }): Promise<any> {
    // Implementation
    return null;
  }
  
  async getNotificationHistory(userId: number): Promise<any[]> {
    // Implementation
    return [];
  }
  
  async markNotificationAsRead(userId: number, notificationId: string): Promise<void> {
    // Implementation
  }
  
  async getAllAchievements(): Promise<any[]> {
    // Implementation
    return [];
  }
  
  async getUserAchievements(userId: number): Promise<any[]> {
    // Implementation
    return [];
  }
  
  async getUserAchievementProgress(userId: number): Promise<any[]> {
    // Implementation
    return [];
  }
  
  async getAchievementLeaderboard(limit: number): Promise<any[]> {
    // Implementation
    return [];
  }
  
  async awardAchievement(userId: number, achievementId: number): Promise<void> {
    // Implementation
  }
  
  async getHomeUserOnboardingStatus(userId: number): Promise<HomeUserOnboarding | undefined> {
    const [onboarding] = await db.select().from(homeUserOnboarding).where(eq(homeUserOnboarding.userId, userId));
    return onboarding;
  }
  
  async createHomeUserOnboardingStatus(userId: number): Promise<HomeUserOnboarding> {
    const [newOnboarding] = await db.insert(homeUserOnboarding)
      .values({ userId })
      .returning();
    return newOnboarding;
  }
  
  async updateHomeUserParqStatus(userId: number, status: string, completedAt?: Date): Promise<HomeUserOnboarding> {
    const [updated] = await db.update(homeUserOnboarding)
      .set({ 
        parqStatus: status,
        parqCompletedAt: completedAt,
        updatedAt: new Date()
      })
      .where(eq(homeUserOnboarding.userId, userId))
      .returning();
    return updated;
  }
  
  async updateHomeUserPostureStatus(userId: number, status: string, completedAt?: Date): Promise<HomeUserOnboarding> {
    const [updated] = await db.update(homeUserOnboarding)
      .set({ 
        postureAssessmentStatus: status,
        postureAssessmentCompletedAt: completedAt,
        updatedAt: new Date()
      })
      .where(eq(homeUserOnboarding.userId, userId))
      .returning();
    return updated;
  }
  
  async updateHomeUserSafetyVideoStatus(userId: number, status: string, completedAt?: Date): Promise<HomeUserOnboarding> {
    const [updated] = await db.update(homeUserOnboarding)
      .set({ 
        safetyVideoStatus: status,
        safetyVideoCompletedAt: completedAt,
        updatedAt: new Date()
      })
      .where(eq(homeUserOnboarding.userId, userId))
      .returning();
    return updated;
  }
  
  async updateHomeUserEligibility(userId: number, isEligible: boolean): Promise<HomeUserOnboarding> {
    const [updated] = await db.update(homeUserOnboarding)
      .set({ 
        isEligibleForBooking: isEligible,
        updatedAt: new Date()
      })
      .where(eq(homeUserOnboarding.userId, userId))
      .returning();
    return updated;
  }
  
  async getHomeUserPostureAssessment(userId: number): Promise<HomeUserPostureAssessment | undefined> {
    const [assessment] = await db.select().from(homeUserPostureAssessment).where(eq(homeUserPostureAssessment.userId, userId));
    return assessment;
  }
  
  async updateHomeUserPostureAssessment(userId: number, data: Partial<InsertHomeUserPostureAssessment>): Promise<HomeUserPostureAssessment> {
    // First try to find existing assessment
    const existing = await this.getHomeUserPostureAssessment(userId);
    
    if (existing) {
      // Update existing assessment
      const [updated] = await db.update(homeUserPostureAssessment)
        .set({ 
          ...data,
          updatedAt: new Date()
        })
        .where(eq(homeUserPostureAssessment.userId, userId))
        .returning();
      return updated;
    } else {
      // Create new assessment
      const [newAssessment] = await db.insert(homeUserPostureAssessment)
        .values({ 
          userId,
          ...data
        })
        .returning();
      return newAssessment;
    }
  }

  async logSafetyVideoProgress(userId: number, progressData: {
    videoId: string;
    watchedDuration: number;
    totalDuration: number;
    percentageWatched: number;
    isCompleted: boolean;
  }): Promise<UserSafetyVideoLog> {
    const [logEntry] = await db.insert(userSafetyVideoLogs)
      .values({
        userId,
        videoId: progressData.videoId,
        watchedDuration: progressData.watchedDuration,
        totalDuration: progressData.totalDuration,
        percentageWatched: progressData.percentageWatched,
        isCompleted: progressData.isCompleted
      })
      .returning();
    return logEntry;
  }
  
  async getSafetyVideoProgress(userId: number, videoId: string): Promise<any> {
    // Implementation
    return null;
  }
  
  async getEmsSessions(userId: number): Promise<any[]> {
    // Implementation
    return [];
  }
  
  async getEmsSessionById(sessionId: number): Promise<any | undefined> {
    // Implementation
    return undefined;
  }
  
  async createEmsSession(data: any): Promise<any> {
    // Implementation
    return null;
  }
  
  async updateEmsSession(sessionId: number, data: any): Promise<any> {
    // Implementation
    return null;
  }
  
  async deleteEmsSession(sessionId: number): Promise<void> {
    // Implementation
  }
  
  async getEmsSessionsCount(userId: number): Promise<number> {
    // Implementation
    return 0;
  }
  
  async getEmsSessionsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation
    return [];
  }
  
  async getEmsSessionsSummary(userId: number): Promise<any> {
    // Implementation
    return null;
  }
  
  async getEmsProgress(userId: number): Promise<any[]> {
    // Implementation
    return [];
  }
  
  async createEmsProgress(data: any): Promise<any> {
    // Implementation
    return null;
  }
  
  async getEmsEquipment(userId: number): Promise<any | undefined> {
    // Implementation
    return undefined;
  }
  
  async createEmsEquipment(data: any): Promise<any> {
    // Implementation
    return null;
  }
  
  async updateEmsEquipment(equipmentId: number, data: any): Promise<any> {
    // Implementation
    return null;
  }
  
  async getEmsSettings(userId: number): Promise<any | undefined> {
    // Implementation
    return undefined;
  }
  
  async createEmsSettings(data: any): Promise<any> {
    // Implementation
    return null;
  }
  
  async updateEmsSettings(userId: number, data: any): Promise<any> {
    // Implementation
    return null;
  }
  
  async getAllLocations(): Promise<any[]> {
    const allLocations = await db.select().from(locations);
    return allLocations;
  }

  // Membership operations
  async getMembershipTypes(): Promise<MembershipType[]> {
    const types = await db.select().from(membershipTypes);
    return types;
  }

  async getMembershipType(id: number): Promise<MembershipType | undefined> {
    const [type] = await db.select().from(membershipTypes).where(eq(membershipTypes.id, id));
    return type;
  }
}

export const storage = new DatabaseStorage();