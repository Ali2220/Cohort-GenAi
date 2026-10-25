// ZUSTAND STORE 
// Ye store poore editor ki global state manage karta hai
// Multiple components (Canvas, Toolbar, Sidebar) isay share karte hain

import { create } from "zustand";
import { devtools } from "zustand/middleware";  // Redux DevTools ke liye middleware

// TYPE DEFINITION
// TypeScript ko batata hai ke store mein kya hoga
type EditorState = {
    // STATE: Image data (Base64 string ya null)
    image: string | null;
    
    // ACTION: Image ko update karne ka function
    setImage: (imageData: string | null) => void;
};

// STORE CREATION
// create<EditorState>()() → Double parentheses zaroori hain jab middleware use karo
// devtools() → Redux DevTools mein state track karne ke liye
export const useEditorStore = create<EditorState>()(
    devtools(
        // STORE DEFINITION
        // set → Zustand ka function jo state update karta hai
        (set) => ({
            
            // INITIAL STATE
            // Jab app pehli baar load hoti hai, image null hoti hai
            image: null,
            
            // ACTION: setImage
            // Ye function state ko update karta hai
            setImage: (imageData: string | null) =>
                set(
                    // 1st arg: New state object (ya updater function)
                    () => ({ image: imageData }),
                    
                    // 2nd arg: replace? (false = merge, true = replace poora state)
                    false,
                    
                    // 3rd arg: Action name (DevTools mein dikhega)
                    "setImage"
                ),
        })
    )
);
