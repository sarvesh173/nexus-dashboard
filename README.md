# Nexus Agent Telemetry & Model Engine (Nexus-Dashboard)

> **Status:** Staging / Active Development
> **Target:** High-performance, low-overhead agentic telemetry runtime and multi-provider model routing dashboard.

Nexus Dashboard is an agentic telemetry and observability cockpit engineered to track live inference, multi-provider model catalogs (81 providers, 834 live models), cost intelligence, and hardware health metrics in real-time.

---

## ⚡ Core Features

- **Dynamic Fluid Model Grid:** Proportional auto-fill grid layout with responsive zero-gap card architecture, native bidirectional resizing, and compact modality tiering.
- **5-Modality Breakdown Engine:** Instant categorization across `LLM`, `Vision`, `Embedding`, `STT` (Speech-to-Text), and `TTS` (Text-to-Speech) for all connected providers.
- **Provider & Model Catalog (`/model` & `/model/:providerId`):** Deep inspection interface with live upstream fetch, custom model injection, model-level hide/restore rails, active modality filters, and capability telemetry.
- **Live Model Test Runner:** Per-model probe returning real response text and latency, with a 12-second deadline, sequential `Test All`, and auto-hide on failure.
- **Real Context Window Resolution:** Context lengths resolved per model from upstream metadata instead of assumed defaults.
- **Interactive Playground (`/playground`):** Cupertino-style frosted chat canvas for direct model interaction with live latency badges.
- **Price & Cost Scanner (`/cost`):** Live model cost scanner tracking input/output token pricing across foundational providers.
- **Hardware & Telemetry Overview (`/`):** Real-time monitoring of CPU, RAM, swap, disk, active agent sessions, and routing latency.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Tailwind CSS v4, Vite, Lucide Icons, React Router v7.
- **Backend Telemetry:** Lightweight Python async server streaming live provider catalogs and hardware telemetry.
- **Design System:** Material Design 3 (M3) tokenized themes with persistent palette switching, spring easing, and per-tab micro-animations.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- Python 3.10+

### Setup & Run
```bash
# Clone the repository
git clone git@github.com:sarvesh173/nexus-dashboard.git
cd nexus-dashboard

# Install frontend dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📌 Development Roadmap

- [x] Zero-gap proportional card grid layout with 2-column live model stream.
- [x] Full-bleed widescreen canvas with dynamic column balancing.
- [x] Client-side auto-derivation of modalities across 80+ providers.
- [x] Live model test runner with latency reporting and failure auto-hide.
- [x] Interactive playground with real-time inference and latency badges.
- [x] Upstream model catalog fetch and custom model injection.
- [ ] Real-time WebSocket sync for live inference sessions and token streaming.
- [ ] Autonomous model health and failover metrics.

---

*Engineered by [@sarvesh173](https://github.com/sarvesh173).*