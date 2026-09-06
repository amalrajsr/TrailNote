import "server-only";

import {
  parseEnvironment,
  requireAuthEnvironment,
  requireDatabaseEnvironment,
  requireImageKitEnvironment,
  requireOperationsEnvironment,
} from "./env-schema";

export const env = Object.freeze(parseEnvironment(process.env));

export function getDatabaseEnvironment() {
  return requireDatabaseEnvironment(env);
}

export function getAuthEnvironment() {
  return requireAuthEnvironment(env);
}

export function getImageKitEnvironment() {
  return requireImageKitEnvironment(env);
}

export function getOperationsEnvironment() {
  return requireOperationsEnvironment(env);
}
