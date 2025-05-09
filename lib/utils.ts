import { customAlphabet } from "nanoid";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789");

// Helper function to read file as Data URL
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