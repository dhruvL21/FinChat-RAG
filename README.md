# FinChat AI | Elite Financial Guardian 🛡️💰

FinChat AI is a sophisticated financial intelligence platform designed specifically for the Indian market. It transforms your raw financial data—from bank statements to manual logs—into actionable strategic insights using state-of-the-art Generative AI (Genkit & Gemini).

## 🚀 Key Features

- **Elite AI Strategist**: Chat with an AI mentor trained to act as a rigorous financial guardian. It scrutinizes transaction-level details ("items consumed") and provides recovery plans for budget breaches.
- **Indian Rupee (₹) Native**: All calculations, charts, budget guardrails, and AI analysis are performed strictly in INR.
- **Dynamic Insights**: Real-time spending distribution charts and budget vs. actual monitors with visual alerts for over-limit categories.
- **Document Indexing**: Upload bank statements (CSV) or financial records (PDF) to build your private, searchable knowledge base.
- **Manual Ledger**: Quickly log daily expenses that are immediately categorized by AI and indexed for your guardian's analysis.
- **Resilient AI**: Built-in exponential backoff to handle API rate limits (429 errors) seamlessly.
- **Responsive Design**: A premium, mobile-first interface built with Shadcn UI and Tailwind CSS, perfectly aligned for all devices.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **AI Engine**: [Firebase Genkit](https://firebase.google.com/docs/genkit) & Google Gemini 2.5 Flash
- **Database & Auth**: [Firebase Firestore](https://firebase.google.com/docs/firestore) & [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Charts**: [Recharts](https://recharts.org/)

## 🏁 Getting Started

### Prerequisites

- Node.js 20 or later
- A Google Cloud/Firebase project with the Gemini API enabled

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your environment variables:
   Create a `.env` file in the root directory and add your Google AI API key:
   ```env
   GOOGLE_GENAI_API_KEY=your_gemini_api_key
   ```
   *(Note: Firebase client configuration is automatically handled via `src/firebase/config.ts` for development)*

### Running the App

Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:9002`.

### AI Development (Optional)

To explore and test Genkit AI flows in the local developer UI:
```bash
npm run genkit:dev
```

## 📈 Usage Guide

1. **Populate Data**: Navigate to **Ledger Docs** to upload a bank CSV. Alternatively, use the **Add Expense** button on the Dashboard for quick manual entries.
2. **Monitor Limits**: Check the **Financial Intel** page to see your real-time budget status. The app tracks strict limits for Food (₹15k), Shopping (₹8k), Travel (₹10k), and more.
3. **Consult the Guardian**: Use **FinChat AI** to ask specific questions like:
   - *"Analyze my food spending. Which specific items caused me to go over my ₹15,000 budget?"*
   - *"Create a strict recovery plan for next month since I overspent today."*
   - *"Show me a breakdown of my miscellaneous expenses and identify hidden waste."*

## 🔒 Security & Privacy

FinChat AI implements **Strict Ownership-based Authorization**. All documents, transaction segments, and chat sessions are stored in private Firestore hierarchies (`/users/{userId}/...`). Security rules ensure that only the authenticated user (including anonymous sessions) can read or write their own financial records.

---
*Built with ❤️ for Financial Freedom.*