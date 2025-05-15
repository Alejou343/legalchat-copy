import { useEffect, useRef } from "react";

/**
 * Custom hook to automatically resize a textarea based on its content.
 * @param value - The current value of the textarea.
 * @param minHeight - The minimum height of the textarea (in pixels).
 * @param maxHeight - The maximum height of the textarea (in pixels).
 * @returns A ref to be attached to the textarea element.
 */
export function useTextareaAutoResize(
    value: string,
    minHeight = 36,
    maxHeight = 200
) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const FUDGE_FACTOR = 1; // Small factor to prevent scrollbar from appearing unnecessarily
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"; // Reset height to correctly calculate scrollHeight
            let newHeight = textareaRef.current.scrollHeight + FUDGE_FACTOR;

            if (value === "") { // When input is empty, revert to minHeight
                newHeight = minHeight;
            } else {
                newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
            }
            textareaRef.current.style.height = `${newHeight}px`;
        }
    }, [value, minHeight, maxHeight]);

    return textareaRef;
}
