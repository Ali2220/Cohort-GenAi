# 📝 Server-Sent Events (SSE) — Short Notes

---

### 1. What is SSE? (Definition)
* **Real-time Web Standard:** Server se client ki taraf continuous data stream karne ka tariqa.
* **Connection:** Standard HTTP connection ko **open** rakhta hai (`res.write()` ke zariye).
* **Direction:** **Unidirectional** (Sirf Server ➔ Client).

---

### 2. Core Features
* **Protocol:** Pure **HTTP / HTTPS** par chalta hai (WebSocket protocol `ws://` ki zaroorat nahi).
* **Format:** Plain Text (`text/event-stream`).
* **Auto-Reconnection:** Browser connection tootne par automatically reconnect karta hai.
* **Use Cases:** AI LLM Token Streaming, Live News Feed, Stock Tickers, Generative UI.

---

### 3. Essential SSE Headers (Backend)
```http
Content-Type: text/event-stream  // Browser ko batata hai ke stream data hai
Cache-Control: no-cache          // Browser data cache na kare
Connection: keep-alive           // Connection ko open rakhe