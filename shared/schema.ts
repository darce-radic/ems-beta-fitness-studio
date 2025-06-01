import { pgTable, serial, text, timestamp, integer, varchar, boolean, json, jsonb, index, pgEnum, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User role enum
export const UserRole = {
  ADMIN: "ADMIN",
  TRAINER: "TRAINER",
  CLIENT: "CLIENT",
};

// EMS Session types enum
export const EMSSessionType = {
  FULL_BODY: "FULL_BODY",
  LOWER_BODY: "LOWER_BODY",
  UPPER_BODY: "UPPER_BODY",
  CORE: "CORE",
  RECOVERY: "RECOVERY",
};

// EMS Intensity levels enum
export const EMSIntensity = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
};

// Onboarding step status enum
export const OnboardingStepStatus = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
};

// Credit operations enum
export const CreditOperation = {
  GRANT: "GRANT",
  REDEEM: "REDEEM",
  EXPIRE: "EXPIRE",
  REFUND: "REFUND",
};

// Credit status enum
export const CreditStatus = {
  ACTIVE: "ACTIVE",
  USED: "USED",
  EXPIRED: "EXPIRED",
};

// Credit source enum
export const CreditSource = {
  MEMBERSHIP: "MEMBERSHIP",
  PURCHASE: "PURCHASE",
  ADMIN: "ADMIN",
  PROMOTION: "PROMOTION",
  OTHER: "OTHER",
};

// Membership status enum
export const MembershipStatus = {
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
};

// Session storage table (for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique(),
  username: varchar("username").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  hashedPassword: text("hashed_password"),
  role: text("role").default(UserRole.CLIENT).notNull(),
  phoneNumber: varchar("phone_number").unique(),
  image: text("image"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  preferences: json("preferences"),
  credits: integer("credits").default(10),
  isActive: boolean("is_active").default(true).notNull(),
  emailVerified: timestamp("email_verified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Membership Types table
export const membershipTypes = pgTable("membership_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: text("price").notNull(),
  duration: integer("duration").notNull(), // in days
  creditAmount: integer("credit_amount").notNull(),
  creditFrequency: text("credit_frequency").notNull(), // weekly, monthly, etc.
  maxClasses: integer("max_classes"),
  active: boolean("active").default(true).notNull(),
  color: text("color"),
  features: json("features").$type<string[]>(),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Memberships table
export const memberships = pgTable("memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  membershipTypeId: integer("membership_type_id").references(() => membershipTypes.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").default("ACTIVE").notNull(), // ACTIVE, PAUSED, CANCELLED, EXPIRED
  autoRenew: boolean("auto_renew").default(false).notNull(),
  paymentMethod: text("payment_method"),
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }),
  nextBillingDate: timestamp("next_billing_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Membership Pauses table
export const membershipPauses = pgTable("membership_pauses", {
  id: serial("id").primaryKey(),
  membershipId: integer("membership_id").references(() => memberships.id, { onDelete: "cascade" }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"),
  status: text("status").default("SCHEDULED").notNull(), // SCHEDULED, ACTIVE, COMPLETED, CANCELLED
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Credits table
export const credits = pgTable("credits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),
  remainingAmount: integer("remaining_amount").notNull(),
  expiryDate: timestamp("expiry_date"),
  source: text("source").notNull(), // MEMBERSHIP, PURCHASE, ADMIN, PROMOTION
  sourceId: text("source_id"), // ID of the membership, purchase, etc.
  status: text("status").default("ACTIVE").notNull(), // ACTIVE, USED, EXPIRED
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Type definitions are declared later in the file

// Credit Logs table
export const creditLogs = pgTable("credit_logs", {
  id: serial("id").primaryKey(),
  creditId: integer("credit_id").references(() => credits.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),
  operation: text("operation").notNull(), // GRANT, REDEEM, EXPIRE, REFUND
  relatedEntityType: text("related_entity_type"), // CLASS, PRIVATE_SESSION, MEMBERSHIP, ADMIN
  relatedEntityId: text("related_entity_id"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Service Types table
export const serviceTypes = pgTable("service_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  duration: integer("duration"), // in minutes
  creditCost: integer("credit_cost").default(1).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bookable Slots table
export const bookableSlots = pgTable("bookable_slots", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  trainerId: varchar("trainer_id").references(() => users.id),
  locationId: integer("location_id"),
  capacity: integer("capacity").default(1).notNull(),
  available: boolean("available").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Classes table
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  serviceTypeId: integer("service_type_id").references(() => serviceTypes.id),
  instructorId: varchar("instructor_id").references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  duration: integer("duration").notNull(), // in minutes
  capacity: integer("capacity").notNull(),
  location: text("location"),
  creditCost: integer("credit_cost").default(1).notNull(),
  recurring: boolean("recurring").default(false).notNull(),
  recurrencePattern: text("recurrence_pattern"), // JSON or text pattern for recurrence
  attendeeCount: integer("attendee_count").default(0).notNull(),
  status: text("status").default("SCHEDULED").notNull(), // SCHEDULED, CANCELLED, COMPLETED
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Private Sessions table
export const privateSessions = pgTable("private_sessions", {
  id: serial("id").primaryKey(),
  clientId: varchar("client_id").references(() => users.id).notNull(),
  trainerId: varchar("trainer_id").references(() => users.id).notNull(),
  slotId: integer("slot_id").references(() => bookableSlots.id),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  duration: integer("duration").notNull(), // in minutes
  location: text("location"),
  notes: text("notes"),
  status: text("status").default("SCHEDULED").notNull(), // SCHEDULED, CANCELLED, COMPLETED
  creditCost: integer("credit_cost").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  staffId: integer("staff_id").references(() => users.id),
  type: text("type").notNull(), // CLASS, PRIVATE_SESSION
  entityId: integer("entity_id").notNull(), // class_id or private_session_id
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  status: text("status").default("BOOKED").notNull(), // BOOKED, CANCELLED, ATTENDED, NO_SHOW
  cancellationReason: text("cancellation_reason"),
  creditAmount: integer("credit_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Waitlist table
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  position: integer("position").notNull(),
  status: text("status").default("WAITING").notNull(), // WAITING, NOTIFIED, BOOKED, EXPIRED
  notifiedAt: timestamp("notified_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Attendance table
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status").default("PRESENT").notNull(), // PRESENT, ABSENT, LATE
  checkinTime: timestamp("checkin_time"),
  checkoutTime: timestamp("checkout_time"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").default("USD").notNull(),
  status: text("status").notNull(), // PENDING, COMPLETED, FAILED, REFUNDED
  type: text("type").notNull(), // MEMBERSHIP, CREDITS, SESSION
  relatedEntityType: text("related_entity_type"), // MEMBERSHIP, CREDIT_PACKAGE
  relatedEntityId: text("related_entity_id"),
  paymentMethod: text("payment_method"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  receipt: text("receipt"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Locations table
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  capacity: integer("capacity"),
  active: boolean("active").default(true).notNull(),
  features: json("features").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Achievements table
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  criteria: text("criteria").notNull(),
  icon: text("icon"),
  category: text("category"),
  points: integer("points").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User Achievements table
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  achievementId: integer("achievement_id").references(() => achievements.id).notNull(),
  dateEarned: timestamp("date_earned").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Email Verification Tokens table
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Password Reset Tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Virtual Classes schema
export const virtualClasses = pgTable("virtual_classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  instructorId: varchar("instructor_id").references(() => users.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  capacity: integer("capacity").notNull(),
  creditCost: integer("credit_cost").default(1).notNull(),
  zoomMeetingId: text("zoom_meeting_id"),
  zoomPassword: text("zoom_password"),
  meetingUrl: text("meeting_url").notNull(),
  isRecorded: boolean("is_recorded").default(false).notNull(),
  recordingUrl: text("recording_url"),
  previewImageUrl: text("preview_image_url"),
  equipmentNeeded: json("equipment_needed").$type<string[]>(),
  experienceLevel: text("experience_level").default("ALL"),
  status: text("status").default("SCHEDULED").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Client Training Plans schema
export const trainingPlans = pgTable("training_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  trainerId: varchar("trainer_id").references(() => users.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  goals: json("goals").$type<string[]>(),
  notes: text("notes"),
  status: text("status").default("ACTIVE").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Training Plan Exercises schema
export const trainingPlanExercises = pgTable("training_plan_exercises", {
  id: serial("id").primaryKey(),
  trainingPlanId: integer("training_plan_id").references(() => trainingPlans.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  sets: integer("sets"),
  reps: text("reps"),
  weight: text("weight"),
  duration: text("duration"),
  restPeriod: text("rest_period"),
  videoUrl: text("video_url"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  dayOfWeek: text("day_of_week"),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// EMS Sessions schema
export const emsSessions = pgTable("ems_sessions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  timeSlot: text("time_slot").notNull(), // e.g., "9:00 AM"
  sessionType: text("session_type").notNull(), // Reference to EMSSessionType enum
  intensityLevel: text("intensity_level").notNull(), // Reference to EMSIntensity enum
  locationId: integer("location_id").references(() => locations.id).notNull(),
  muscleActivation: json("muscle_activation").$type<Record<string, number>>(), // Store muscle activation percentages by muscle group
  notes: text("notes"),
  status: text("status").default("SCHEDULED").notNull(), // SCHEDULED, COMPLETED, CANCELLED, NO_SHOW
  creditCost: integer("credit_cost").default(1).notNull(),
  duration: integer("duration").default(20).notNull(), // EMS sessions are typically 20 minutes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// EMS Equipment schema
export const emsEquipment = pgTable("ems_equipment", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  serialNumber: text("serial_number").unique(),
  locationId: integer("location_id").references(() => locations.id),
  status: text("status").default("ACTIVE").notNull(), // ACTIVE, MAINTENANCE, RETIRED
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  nextMaintenanceDate: timestamp("next_maintenance_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// EMS Session Results schema
export const emsSessionResults = pgTable("ems_session_results", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => emsSessions.id, { onDelete: "cascade" }).notNull(),
  clientId: integer("client_id").references(() => users.id).notNull(),
  muscleActivation: json("muscle_activation").$type<Record<string, number>>(), // Store muscle activation percentages
  caloriesBurned: integer("calories_burned"),
  averageIntensity: integer("average_intensity"), // 1-10 scale
  feedbackRating: integer("feedback_rating"), // 1-5 scale
  clientFeedback: text("client_feedback"),
  trainerNotes: text("trainer_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Trainer Availability schema
export const trainerAvailability = pgTable("trainer_availability", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(), // e.g., "9:00 AM"
  endTime: text("end_time").notNull(), // e.g., "5:00 PM"
  isAvailable: boolean("is_available").default(true).notNull(),
  recurrence: text("recurrence"), // NONE, DAILY, WEEKLY, MONTHLY
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTrainerAvailabilitySchema = createInsertSchema(trainerAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TrainerAvailability = typeof trainerAvailability.$inferSelect;
export type InsertTrainerAvailability = z.infer<typeof insertTrainerAvailabilitySchema>;

// EMS Client Progress schema
export const emsClientProgress = pgTable("ems_client_progress", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date").notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  bodyFatPercentage: decimal("body_fat_percentage", { precision: 5, scale: 2 }),
  musclePercentage: decimal("muscle_percentage", { precision: 5, scale: 2 }),
  measurements: json("measurements").$type<Record<string, number>>(), // Store body measurements
  notes: text("notes"),
  trainerId: integer("trainer_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// EMS Packages schema
export const emsPackages = pgTable("ems_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sessionCount: integer("session_count").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  validityDays: integer("validity_days").notNull(), // how many days the package is valid for
  isActive: boolean("is_active").default(true).notNull(),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// EMS Client Packages schema
export const emsClientPackages = pgTable("ems_client_packages", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  packageId: integer("package_id").references(() => emsPackages.id).notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  sessionsRemaining: integer("sessions_remaining").notNull(),
  status: text("status").default("ACTIVE").notNull(), // ACTIVE, EXPIRED, CANCELLED
  paymentId: integer("payment_id").references(() => payments.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Virtual Class Bookings schema
export const virtualClassBookings = pgTable("virtual_class_bookings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  virtualClassId: integer("virtual_class_id").references(() => virtualClasses.id).notNull(),
  status: text("status").default("BOOKED").notNull(),
  creditAmount: integer("credit_amount").notNull(),
  attendanceStatus: text("attendance_status"),
  joinedAt: timestamp("joined_at"),
  leftAt: timestamp("left_at"),
  feedback: text("feedback"),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Exercise Progress Tracking schema
export const exerciseProgress = pgTable("exercise_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  exerciseId: integer("exercise_id").references(() => trainingPlanExercises.id).notNull(),
  date: timestamp("date").notNull(),
  completedSets: integer("completed_sets"),
  completedReps: text("completed_reps"),
  weight: text("weight"),
  duration: text("duration"),
  notes: text("notes"),
  difficulty: integer("difficulty"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Create insertion schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMembershipTypeSchema = createInsertSchema(membershipTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMembershipSchema = createInsertSchema(memberships).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMembershipPauseSchema = createInsertSchema(membershipPauses).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCreditSchema = createInsertSchema(credits).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCreditLogSchema = createInsertSchema(creditLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertServiceTypeSchema = createInsertSchema(serviceTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBookableSlotSchema = createInsertSchema(bookableSlots).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertPrivateSessionSchema = createInsertSchema(privateSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertWaitlistSchema = createInsertSchema(waitlist).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertVirtualClassSchema = createInsertSchema(virtualClasses).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTrainingPlanSchema = createInsertSchema(trainingPlans).omit({
  id: true,
  createdAt: true, 
  updatedAt: true
});

export const insertTrainingPlanExerciseSchema = createInsertSchema(trainingPlanExercises).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertVirtualClassBookingSchema = createInsertSchema(virtualClassBookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertExerciseProgressSchema = createInsertSchema(exerciseProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Type definitions for schemas
export type Credit = typeof credits.$inferSelect;
export type InsertCredit = typeof credits.$inferInsert;

export type MembershipType = typeof membershipTypes.$inferSelect;
export type InsertMembershipType = z.infer<typeof insertMembershipTypeSchema>;

export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = z.infer<typeof insertMembershipSchema>;

export type MembershipPause = typeof membershipPauses.$inferSelect;
export type InsertMembershipPause = z.infer<typeof insertMembershipPauseSchema>;

export type CreditLog = typeof creditLogs.$inferSelect;
export type InsertCreditLog = z.infer<typeof insertCreditLogSchema>;

export type ServiceType = typeof serviceTypes.$inferSelect;
export type InsertServiceType = z.infer<typeof insertServiceTypeSchema>;

export type BookableSlot = typeof bookableSlots.$inferSelect;
export type InsertBookableSlot = z.infer<typeof insertBookableSlotSchema>;

export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;

export type PrivateSession = typeof privateSessions.$inferSelect;
export type InsertPrivateSession = z.infer<typeof insertPrivateSessionSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Waitlist = typeof waitlist.$inferSelect;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export type VirtualClass = typeof virtualClasses.$inferSelect;
export type InsertVirtualClass = z.infer<typeof insertVirtualClassSchema>;

export type TrainingPlan = typeof trainingPlans.$inferSelect;
export type InsertTrainingPlan = z.infer<typeof insertTrainingPlanSchema>;

export type TrainingPlanExercise = typeof trainingPlanExercises.$inferSelect;
export type InsertTrainingPlanExercise = z.infer<typeof insertTrainingPlanExerciseSchema>;

export type VirtualClassBooking = typeof virtualClassBookings.$inferSelect;
export type InsertVirtualClassBooking = z.infer<typeof insertVirtualClassBookingSchema>;

export type ExerciseProgress = typeof exerciseProgress.$inferSelect;
export type InsertExerciseProgress = z.infer<typeof insertExerciseProgressSchema>;

export const clientMessages = pgTable('client_messages', {
  id: serial('id').primaryKey(),
  recipientId: varchar('recipient_id', { length: 255 }).notNull(),
  senderId: varchar('sender_id', { length: 255 }).notNull(),
  senderName: varchar('sender_name', { length: 255 }).notNull(),
  senderRole: varchar('sender_role', { length: 50 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  content: text('content').notNull(),
  messageType: varchar('message_type', { length: 50 }).default('general').notNull(),
  priority: varchar('priority', { length: 20 }).default('normal').notNull(),
  readStatus: boolean('read_status').default(false).notNull(),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertClientMessageSchema = createInsertSchema(clientMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type ClientMessage = typeof clientMessages.$inferSelect;
export type InsertClientMessage = z.infer<typeof insertClientMessageSchema>;

export const dailyMotivationQuotes = pgTable('daily_motivation_quotes', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  quote: text('quote').notNull(),
  author: varchar('author', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  personalizationReason: text('personalization_reason').notNull(),
  wellnessTip: text('wellness_tip').notNull(),
  dateGenerated: varchar('date_generated', { length: 10 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userDateIdx: index('user_date_idx').on(table.userId, table.dateGenerated),
  uniqueUserDate: index('unique_user_date').on(table.userId, table.dateGenerated),
}));

export const insertDailyMotivationQuoteSchema = createInsertSchema(dailyMotivationQuotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type DailyMotivationQuote = typeof dailyMotivationQuotes.$inferSelect;
export type InsertDailyMotivationQuote = z.infer<typeof insertDailyMotivationQuoteSchema>;

// Home onboarding tables
export const homeUserOnboarding = pgTable("home_user_onboarding", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  parqStatus: text("parq_status").default("NOT_STARTED").notNull(),
  parqCompletedAt: timestamp("parq_completed_at", { withTimezone: true }),
  postureAssessmentStatus: text("posture_assessment_status").default("NOT_STARTED").notNull(),
  postureAssessmentCompletedAt: timestamp("posture_assessment_completed_at", { withTimezone: true }),
  safetyVideoStatus: text("safety_video_status").default("NOT_STARTED").notNull(),
  safetyVideoCompletedAt: timestamp("safety_video_completed_at", { withTimezone: true }),
  isEligibleForBooking: boolean("is_eligible_for_booking").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const homeUserPostureAssessment = pgTable("home_user_posture_assessment", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  frontViewImageUrl: text("front_view_image_url"),
  sideViewImageUrl: text("side_view_image_url"),
  anteriorSquatVideoUrl: text("anterior_squat_video_url"),
  posteriorSquatVideoUrl: text("posterior_squat_video_url"),
  sideSquatVideoUrl: text("side_squat_video_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userSafetyVideoLogs = pgTable("user_safety_video_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  videoId: text("video_id").notNull(),
  watchedDuration: integer("watched_duration").notNull(),
  totalDuration: integer("total_duration").notNull(),
  percentageWatched: decimal("percentage_watched").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  watchedAt: timestamp("watched_at", { withTimezone: true }).defaultNow().notNull(),
});

// Insert schemas for home onboarding
export const insertHomeUserOnboardingSchema = createInsertSchema(homeUserOnboarding);
export const insertHomeUserPostureAssessmentSchema = createInsertSchema(homeUserPostureAssessment);
export const insertUserSafetyVideoLogSchema = createInsertSchema(userSafetyVideoLogs);

export type HomeUserOnboarding = typeof homeUserOnboarding.$inferSelect;
export type InsertHomeUserOnboarding = z.infer<typeof insertHomeUserOnboardingSchema>;

export type HomeUserPostureAssessment = typeof homeUserPostureAssessment.$inferSelect;
export type InsertHomeUserPostureAssessment = z.infer<typeof insertHomeUserPostureAssessmentSchema>;

export type UserSafetyVideoLog = typeof userSafetyVideoLogs.$inferSelect;
export type InsertUserSafetyVideoLog = z.infer<typeof insertUserSafetyVideoLogSchema>;

// Add missing studio management tables
export const studios = pgTable("studios", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  timezone: text("timezone").default("UTC"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  studioId: integer("studio_id").references(() => studios.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  capacity: integer("capacity").default(1).notNull(),
  hasEquipment: boolean("has_equipment").default(false).notNull(),
  equipmentCount: integer("equipment_count").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  serviceTypeId: integer("service_type_id").references(() => serviceTypes.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  duration: integer("duration").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const serviceInstances = pgTable("service_instances", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  trainerId: integer("trainer_id").references(() => users.id),
  roomId: integer("room_id").references(() => rooms.id),
  date: timestamp("date", { withTimezone: true }).notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  maxParticipants: integer("max_participants").default(1).notNull(),
  notes: text("notes"),
  isCancelled: boolean("is_cancelled").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const serviceInstanceBookings = pgTable("service_instance_bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  serviceInstanceId: integer("service_instance_id").references(() => serviceInstances.id).notNull(),
  creditAmount: integer("credit_amount").notNull(),
  status: varchar("status", { length: 50 }).default("CONFIRMED").notNull(),
  notes: text("notes"),
  bookedAt: timestamp("booked_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Insert schemas
export const insertStudioSchema = createInsertSchema(studios);
export const insertRoomSchema = createInsertSchema(rooms);
export const insertServiceSchema = createInsertSchema(services);
export const insertServiceInstanceSchema = createInsertSchema(serviceInstances);
export const insertServiceInstanceBookingSchema = createInsertSchema(serviceInstanceBookings);

export type Studio = typeof studios.$inferSelect;
export type InsertStudio = z.infer<typeof insertStudioSchema>;

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type ServiceInstance = typeof serviceInstances.$inferSelect;
export type InsertServiceInstance = z.infer<typeof insertServiceInstanceSchema>;

export type ServiceInstanceBooking = typeof serviceInstanceBookings.$inferSelect;
export type InsertServiceInstanceBooking = z.infer<typeof insertServiceInstanceBookingSchema>;

// System Configuration table
export const systemConfigurations = pgTable("system_configurations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  configuration: jsonb("configuration").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSystemConfigurationSchema = createInsertSchema(systemConfigurations);
export type SystemConfiguration = typeof systemConfigurations.$inferSelect;
export type InsertSystemConfiguration = z.infer<typeof insertSystemConfigurationSchema>;

// User credits ledger table
export const userCreditsLedger = pgTable("user_credits_ledger", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  creditAmount: integer("credit_amount").notNull(),
  operation: varchar("operation", { length: 50 }).notNull(),
  source: varchar("source", { length: 100 }),
  description: text("description"),
  transactionId: varchar("transaction_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserCreditsLedgerSchema = createInsertSchema(userCreditsLedger);
export type UserCreditsLedger = typeof userCreditsLedger.$inferSelect;
export type InsertUserCreditsLedger = z.infer<typeof insertUserCreditsLedgerSchema>;

// User service usage summary table
export const userServiceUsageSummary = pgTable("user_service_usage_summary", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  serviceTypeId: integer("service_type_id").references(() => serviceTypes.id).notNull(),
  totalSessions: integer("total_sessions").default(0).notNull(),
  totalCreditsUsed: integer("total_credits_used").default(0).notNull(),
  lastSessionDate: timestamp("last_session_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserServiceUsageSummarySchema = createInsertSchema(userServiceUsageSummary);
export type UserServiceUsageSummary = typeof userServiceUsageSummary.$inferSelect;
export type InsertUserServiceUsageSummary = z.infer<typeof insertUserServiceUsageSummarySchema>;

// Credit packages table
export const creditPackages = pgTable("credit_packages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  credits: integer("credits").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertCreditPackageSchema = createInsertSchema(creditPackages);
export type CreditPackage = typeof creditPackages.$inferSelect;
export type InsertCreditPackage = z.infer<typeof insertCreditPackageSchema>;

// Membership service allocations table
export const membershipServiceAllocations = pgTable("membership_service_allocations", {
  id: serial("id").primaryKey(),
  membershipTypeId: integer("membership_type_id").references(() => membershipTypes.id).notNull(),
  serviceTypeId: integer("service_type_id").references(() => serviceTypes.id).notNull(),
  creditsIncluded: integer("credits_included").notNull(),
  frequency: varchar("frequency", { length: 50 }).default("monthly").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertMembershipServiceAllocationSchema = createInsertSchema(membershipServiceAllocations);
export type MembershipServiceAllocation = typeof membershipServiceAllocations.$inferSelect;
export type InsertMembershipServiceAllocation = z.infer<typeof insertMembershipServiceAllocationSchema>;

// UpsertUser type needed for Replit Auth
export type UpsertUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  role?: string | null;
  username?: string | null;
};