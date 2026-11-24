import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ======================================
// EDITOR STATE TYPES
// ======================================

type EditorState = {
  // Canvas par currently selected image
  image: string | null;

  // User ka editing prompt
  prompt: string;

  // Original aur AI edited images ki history
  history: string[];

  // Currently selected image ka index
  currentIndex: number;

  // IMAGE ACTIONS
  setImage: (image: string | null) => void;
  setPrompt: (prompt: string) => void;

  // HISTORY ACTIONS
  setHistory: (history: string[]) => void;
  selectVersion: (index: number) => void;

  // AI EDITING ACTION
  generateEdit: () => Promise<void>;

  // undo / redo
  undo: () => void;
  redo: () => void;
};

// ======================================
// ZUSTAND STORE
// ======================================

export const useEditorStore = create<EditorState>()(
  devtools((set, get) => ({
    // ======================================
    // INITIAL STATES
    // ======================================

    image: null,
    prompt: "",
    history: [],
    // -1 ka matlab hai ke koi image select nahi hai
    currentIndex: -1,

    // SET IMAGE
    setImage: (image) =>
      set(
        {
          // Uploaded image canvas par show hogi
          image: image,

          // New image upload hone par
          // purani history reset ho jayegi
          history: image ? [image] : [],

          // First image ka index 0 hoga
          // Agar image nahi hai to -1
          currentIndex: image ? 0 : -1,

          // Previous prompt reset karo
          prompt: "",
        },
        false,
        "setImage",
      ),

    // SET PROMPT
    setPrompt: (prompt) => set({ prompt: prompt }, false, "setPrompt"),

    // SET HISTORY
    setHistory: (history) =>
      set(
        {
          // Updated images ki array save karo
          history: history,

          // History ki last image canvas par show karo
          // Agar history empty hai to null
          image: history.length > 0 ? history[history.length - 1] : null,

          // Latest image ka index save karo
          // Empty history mein index -1 hoga
          currentIndex: history.length - 1,
        },
        false,
        "setHistory",
      ),

    // SELECT HISTORY VERSION
    selectVersion: (index) =>
      set(
        (state) => {
          // Pehle check karo index valid hai ya nahi
          if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= state.history.length
          ) {
            return state;
          }

          // History se selected image nikalo
          const selectedImage = state.history[index];

          return {
            // Selected image canvas par show hogi
            image: selectedImage,

            // Selected image ka index update hoga
            currentIndex: index,
          };
        },
        false,
        "selectVersion",
      ),

    undo: () =>
      set((state) => {
        // pehli image (0) ya khali history (-1) par undo possible nahi
        if (state.currentIndex === 0 || state.currentIndex < 0) {
          return state;
        }

        // Ek qadam peeche jao
        const newIndex = state.currentIndex - 1

        return {
          currentIndex: newIndex,
          image: state.history[newIndex]
        }
      },
        false,
        "undo"
      ),

    redo: () =>
      set((state) => {
        // aakhri image par redo possible nahi
        if (state.currentIndex >= state.history.length - 1) {
          return state
        }

        const newIndex = state.currentIndex + 1

        return {
          currentIndex: newIndex,
          image: state.history[newIndex]
        }
      },
        false,
        "redo"
      ),

    // GENERATE AI IMAGE EDIT
    generateEdit: async () => {
      // Zustand se current image aur prompt lo
      const { image, prompt } = get();

      // Agar image ya prompt missing hai
      // to API request send nahi hogi
      if (!image || !prompt.trim()) {
        throw new Error("Please upload an image and enter a prompt");
      }

      // API REQUEST
      // Image aur prompt Next.js backend ko bhejo
      const response = await fetch("/api/edit-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: image,
          prompt: prompt,
        }),
      });

      // Backend response ko JSON mein convert karo
      const result = await response.json();

      // Agar API request fail ho jaye
      // to error calling component ko milega
      if (!response.ok) {
        throw new Error(result.error || "Failed to edit image");
      }

      // Check karo edited image receive hui hai
      if (
        typeof result.editedImage !== "string" ||
        !result.editedImage.startsWith("data:image/")
      ) {
        throw new Error("No valid edited image was returned");
      }

      // AI se generated image
      const editedImage: string = result.editedImage;

      // ==================================
      // SAVE EDITED IMAGE IN HISTORY
      // ==================================

      // Zustand se latest history access karo
      const currentHistory = get().history;

      // Purani images preserve karte hue
      // edited image array mein add karo
      const updatedHistory = [...currentHistory, editedImage];

      // setHistory action ko call karo
      // Ye history, image aur currentIndex
      // teeno ko automatically update karega
      get().setHistory(updatedHistory);

      console.log("Image edited and saved in history!");
    },


  })),
);
