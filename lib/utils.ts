import { customAlphabet } from "nanoid";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines and merges Tailwind CSS classes with conflict resolution.
 *
 * @param {...ClassValue[]} inputs - An array of class values (strings, objects, arrays).
 * @returns {string} The merged className string with Tailwind conflicts resolved.
 */

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a unique ID using the specified alphabet of lowercase letters and digits.
 */

export const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789");

/**
 * Reads a File object and converts it to a Data URL (base64-encoded string).
 *
 * @param {File} file - The file to read.
 * @returns {Promise<string|null>} A promise resolving to the Data URL string or null if an error occurs.
 */

export const readFileAsDataURL = (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      resolve(null); // Handle errors
    };
    reader.readAsDataURL(file);
  });
};