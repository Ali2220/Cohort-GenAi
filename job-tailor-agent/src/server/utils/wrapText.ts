// wrapText - Lambi lines ko torna
// Input: text (string), maxChars (number, default 95)
// Output: lines (string[]) - array of wrapped lines
export function wrapText(text: string, maxChars = 95): string[] {
  // lines: ["Line 1 text", "Line 2 text", "", "Line 4 text"]
  const lines: string[] = [];

  // text ko paragraphs mein split karein (har \n par)
  // paragraph = ek paragraph ka text
  // Shape: "Ye pehla paragraph hai" ya "" (khali)
  for (const paragraph of text.split("\n")) {
    // Agar paragraph khali hai (sirf spaces/newlines)
    if (paragraph.trim() === "") {
      lines.push(""); // Khali line add karo (spacing ke liye)
      continue;
    }

    // current = current line jo hum bana rahe hain
    // Shape: "" → "Hello" → "Hello world" → "Hello world this"
    let current = "";

    // paragraph ko words mein split karein (space se)
    // word = ek word
    // Shape: "Hello", "world", "this", "is", "a", "test"
    for (const word of paragraph.split(" ")) {
      // Check: agar current + space + word milakar maxChars se barh jaye
      if ((current + " " + word).trim().length > maxChars) {
        // Line bhar gayi! Current ko finalize karo
        lines.push(current.trim());
        // Naye word se nayi line shuru karo
        current = word;
      } else {
        // Line abhi bhar nahi, word jor do
        current += " " + word;
      }
    }
    // Paragraph khatam, bachi hui line push karo
    lines.push(current.trim());
  }

  // Final wrapped lines return karo
  // Shape: ["This is a very long", "paragraph that needs", "to be wrapped"]
  return lines;
}