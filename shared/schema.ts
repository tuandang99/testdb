import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp, jsonb, uniqueIndex, foreignKey, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Database connection/credentials
export const dbConnections = pgTable("db_connections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(5432),
  database: text("database").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  ssl: boolean("ssl").default(false),
  isActive: boolean("is_active").default(false),
  lastConnected: timestamp("last_connected"),
});

export const insertDbConnectionSchema = createInsertSchema(dbConnections).omit({
  id: true,
  lastConnected: true,
  isActive: true,
});

// Saved queries
export const savedQueries = pgTable("saved_queries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  query: text("query").notNull(),
  connectionId: integer("connection_id").references(() => dbConnections.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savedQueriesRelations = relations(savedQueries, ({ one }) => ({
  connection: one(dbConnections, {
    fields: [savedQueries.connectionId],
    references: [dbConnections.id],
  }),
}));

export const insertSavedQuerySchema = createInsertSchema(savedQueries).omit({
  id: true,
  createdAt: true,
});

// Schema for the product management database
// These are used to create the tables in the connected database, not in our application database

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  image: text("image").notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: doublePrecision("price").notNull(),
  oldPrice: doublePrecision("old_price"),
  image: text("image").notNull(),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  rating: doublePrecision("rating").default(5),
  isNew: boolean("is_new").default(false),
  isOrganic: boolean("is_organic").default(true),
  isBestseller: boolean("is_bestseller").default(false),
  details: jsonb("details").default("[]"),
  discount: integer("discount"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
}));

// Product Images table
export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  imagePath: text("image_path").notNull(),
  isMain: boolean("is_main").default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

// Blog Posts table
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt").notNull(),
  image: text("image").notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  tags: text("tags"),
  author: varchar("author", { length: 255 }),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  featured: boolean("featured").default(false),
  status: varchar("status", { length: 20 }).default("published"),
  date: timestamp("date").defaultNow(),
});

// Testimonials table
export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  avatar: text("avatar").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  address: text("address").notNull(),
  items: text("items").notNull(),
  total: doublePrecision("total").notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contacts table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin Keys table
export const adminKeys = pgTable("admin_keys", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  active: boolean("active").default(true),
});

// Types for use in the app
export type InsertDbConnection = z.infer<typeof insertDbConnectionSchema>;
export type DbConnection = typeof dbConnections.$inferSelect;

export type InsertSavedQuery = z.infer<typeof insertSavedQuerySchema>;
export type SavedQuery = typeof savedQueries.$inferSelect;

// Table metadata and schemas
export const tableSchemas = {
  categories,
  products,
  productImages,
  blogPosts,
  testimonials,
  orders,
  contacts,
  adminKeys
};

export type TableName = keyof typeof tableSchemas;
