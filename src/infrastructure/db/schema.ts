import { doublePrecision, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
  }),
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("accounts_user_id_idx").on(table.userId),
  }),
);

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const klassen = pgTable("klassen", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  notizen: text("notizen"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("klassen_user_id_idx").on(table.userId),
}));

export const schueler = pgTable("schueler", {
  id: text("id").primaryKey(),
  klasseId: text("klasse_id").notNull().references(() => klassen.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  initialen: text("initialen").notNull(),
  farbe: text("farbe").notNull(),
  lernstand: text("lernstand"),
  verhalten: text("verhalten"),
  freitextnotizen: text("freitextnotizen"),
  fotoPlaceholderId: text("foto_placeholder_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  klasseIdIdx: index("schueler_klasse_id_idx").on(table.klasseId),
}));

export const sitzregeln = pgTable("sitzregeln", {
  id: text("id").primaryKey(),
  schuelerId: text("schueler_id").notNull().references(() => schueler.id, { onDelete: "cascade" }),
  klasseId: text("klasse_id").notNull().references(() => klassen.id, { onDelete: "cascade" }),
  typ: text("typ").notNull(),
  targetSchuelerId: text("target_schueler_id").references(() => schueler.id, { onDelete: "cascade" }),
  haerte: text("haerte").notNull(),
  gewicht: doublePrecision("gewicht"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  schuelerIdIdx: index("sitzregeln_schueler_id_idx").on(table.schuelerId),
  klasseIdIdx: index("sitzregeln_klasse_id_idx").on(table.klasseId),
}));
