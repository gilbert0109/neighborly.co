/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as availability from "../availability.js";
import type * as bookings from "../bookings.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";
import type * as locations from "../locations.js";
import type * as messages from "../messages.js";
import type * as mitid from "../mitid.js";
import type * as parentApprovals from "../parentApprovals.js";
import type * as reviews from "../reviews.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  availability: typeof availability;
  bookings: typeof bookings;
  http: typeof http;
  jobs: typeof jobs;
  locations: typeof locations;
  messages: typeof messages;
  mitid: typeof mitid;
  parentApprovals: typeof parentApprovals;
  reviews: typeof reviews;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
