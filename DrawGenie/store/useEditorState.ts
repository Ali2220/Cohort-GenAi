
import { create } from "zustand";
import { devtools } from "zustand/middleware";

type EditorState = {
    image: string | null;
    prompt: string;

    isGenerating: boolean;
    error: string | null;

    setImage: (image: string | null) => void;
    setPrompt: (prompt: string) => void;

    generateEdit: () => Promise<void>;
};

export const useEditorStore = create<EditorState>()(
    devtools((set, get) => ({
        // Initial state
        image: null,
        prompt: "",
        isGenerating: false,
        error: null,

        // Set uploaded image
        setImage: (image) =>
            set(
                { image, error: null },
                false,
                "setImage"
            ),

        // Set user prompt
        setPrompt: (prompt) =>
            set({ prompt }, false, "setPrompt"),

        // Generate AI image edit
        generateEdit: async () => {
            // 1. Get latest store state
            const { image, prompt, isGenerating } = get();

            if (isGenerating) return;

            if (!image || !prompt.trim()) {
                throw new Error(
                    "Please upload an image and enter a prompt"
                );
            }

            // 2. Start loading
            set(
                { isGenerating: true, error: null },
                false,
                "generateEdit/start"
            );

            try {
                // 3. Call our Next.js API
                const response = await fetch("/api/edit-image", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        imageBase64: image,
                        prompt,
                    }),
                });

                // 4. Read response
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || "Failed to edit image"
                    );
                }

                if (!result.editedImage) {
                    throw new Error(
                        "No edited image was returned"
                    );
                }

                const editedImage = result.editedImage as string

                console.table({
                    promptSent: prompt,
                    exactlySameData: image === editedImage,
                    originalLength: image.length,
                    editedLength: editedImage.length,
                    validImageData: editedImage.startsWith("data:image/")
                })

                // 5. Save edited image in Zustand
                set(
                    { image: result.editedImage },
                    false,
                    "generateEdit/success"
                );

                console.log("Image edited successfully!");
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Something went wrong";

                // 6. Save error
                set(
                    { error: message },
                    false,
                    "generateEdit/error"
                );

                throw error;
            } finally {
                // 7. Stop loading
                set(
                    { isGenerating: false },
                    false,
                    "generateEdit/finished"
                );
            }
        },
    }))
);
