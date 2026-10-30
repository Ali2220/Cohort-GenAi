// ZUSTAND STORE
// Ye store poore editor ki global state manage karta hai
// Multiple components (Canvas, Toolbar, Sidebar) isay share karte hain

import { create } from "zustand";
import { devtools } from "zustand/middleware"; // Redux DevTools ke liye middleware

// TYPE DEFINITION
// TypeScript ko batata hai ke store mein kya hoga
type EditorState = {
    // STATE: Image
    // Image data (Base64 string ya null)
    image: string | null;

    // STATE: Prompt
    prompt: string;

    // ACTIONS: Image
    // Image ko update karne ka function
    setImage: (imageData: string | null) => void;

    // ACTIONS: Prompt
    // Prompt ko update karne ka function
    setPrompt: (prompt: string) => void;

    // ACTIONS: Main Logic
    // Image + Prompt ko server ke liye prepare karta hai
    generateEdit: () => Promise<void>;
};

// STORE CREATION
// create<EditorState>()() → Double parentheses zaroori hain jab devtools-middleware use karo
// devtools() → Redux DevTools mein state track karne ke liye
export const useEditorStore = create<EditorState>()(
    devtools(
        // STORE DEFINITION
        // set → Zustand ka function jo state update karta hai
        // get → Current state access karne ke liye
        (set, get) => ({
            // INITIAL STATE
            // Jab app pehli baar load hoti hai
            image: null,
            prompt: "",

            // ACTION: setImage
            // Ye function image state ko update karta hai
            setImage: (imageData: string | null) =>
                set(
                    // 1st arg: New state object (ya updater function)
                    () => ({ image: imageData }),

                    // 2nd arg: replace? (false = merge, true = replace poora state)
                    false,

                    // 3rd arg: Action name (DevTools mein dikhega)
                    "setImage",
                ),

            // ACTION: setPrompt
            // Ye function prompt state ko update karta hai
            setPrompt: (prompt: string) =>
                set(() => ({ prompt: prompt }), false, "setPrompt"),

            // ACTION: generateEdit
            // Image + Prompt ko server ke liye prepare karta hai
            generateEdit: async () => {
                // Current state access karo
                const state = get();

                console.log("Sending image and prompt to server...");
                // console.log("Prompt", state.prompt);
                // console.log("Image", state.image);

                // Validation
                if (!state.image || !state.prompt) {
                    return
                }

                try {
                    // Api call
                    const response = await fetch('/api/edit-image', {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json" // JSON bhej rahe hain
                        },
                        body: JSON.stringify({
                            imageBase64: state.image,  // Base64 string
                            prompt: state.prompt   // User's prompt
                        })
                    })

                    if (!response.ok) {
                        throw new Error(`Server error: ${response.status}`)
                    }

                    const result = await response.json()
                    console.log("Result", result);

                } catch (err) {

                }
            },
        }),
    ),
);
