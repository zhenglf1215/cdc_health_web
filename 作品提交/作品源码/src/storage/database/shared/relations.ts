import { relations } from "drizzle-orm/relations";
import { users, userEnvironmentStats, userProfiles, vitalRecords, cdcSessions } from "./schema";

export const userEnvironmentStatsRelations = relations(userEnvironmentStats, ({one}) => ({
	user: one(users, {
		fields: [userEnvironmentStats.user_id],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	userEnvironmentStats: many(userEnvironmentStats),
	userProfiles: many(userProfiles),
	vitalRecords: many(vitalRecords),
	cdcSessions: many(cdcSessions),
}));

export const userProfilesRelations = relations(userProfiles, ({one}) => ({
	user: one(users, {
		fields: [userProfiles.user_id],
		references: [users.id]
	}),
}));

export const vitalRecordsRelations = relations(vitalRecords, ({one}) => ({
	user: one(users, {
		fields: [vitalRecords.user_id],
		references: [users.id]
	}),
}));

export const cdcSessionsRelations = relations(cdcSessions, ({one}) => ({
	user: one(users, {
		fields: [cdcSessions.user_id],
		references: [users.id]
	}),
}));
