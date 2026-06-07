// Welden admin guide content. Each section is a top-level entry rendered by
// AdminGuide. Markdown is parsed by the shared ChatMarkdown component (headings,
// bold, italic, lists, code, links). Edit the prose here; no CMS required.

export type GuideSection = {
  id: string;
  title: string;
  content: string;
};

export const guideSections: GuideSection[] = [
  {
    id: "quick-start",
    title: "Quick Start",
    content: `The Welden Industries platform has three layers:

- A **public website** — the landing page and machine detail pages, which generate leads via the chatbot and contact form.
- An **AI chatbot** — the advisor — that answers buyer questions using approved website content, product data, and the knowledge base, and can issue preliminary quotations.
- This **admin panel** — where staff manage leads, edit content, configure quotation templates, and watch SLA health.

### The day-to-day loop
A visitor talks to the advisor or fills the contact form → a **lead** is captured → it appears in the admin → staff follow up by phone or email → a preliminary quotation goes out → the lead moves through stages (**new → quoted → contacted → qualified → proposal_sent → won / lost**).

### Where to start each shift
Open the **Dashboard**. It surfaces what needs your attention today — first-touch leads waiting, callbacks due now, quoted leads that haven't been called back, and assets pending. From there, click into the **Leads** queue to work each item.`
  },

  {
    id: "admin-sections",
    title: "Sections of the Admin",
    content: `Each section in the left nav does one thing.

### Dashboard
Today's priorities. First-touch leads waiting, callbacks due, quoted leads that haven't been called back, and brochure or detail follow-ups. The single best landing page for a shift.

### Leads
The lead queue. Two views — a **Kanban board** (drag rows between stages) and a **dense table** (filter, search, bulk-edit). Click any lead to open its workspace: contact info, advisor transcript, suggested next action, call-outcome logging, quotation issuance, notes, and the full activity timeline.

### Machines / Products
The product CMS. Edit machine details and build the landing page card plus the machine detail page visually with reorderable blocks. Changes go through a **draft → publish** cycle: save as a draft, preview, then publish to push it live.

### Site Content
The site sections — hero, about, machines lineup, contact, advisor intro, and machine-page shared labels. This is what the chatbot grounds answers on for site-level questions, and what visitors see on the public site.

### Knowledge Base
The advisor's grounding library. Text documents the chatbot uses to answer questions. Set a document to **active** to include it in grounding, **inactive** to exclude it. PDF and video sources can be uploaded for human reference, but the **Extracted Text** field is what the bot actually reads.

### Quotation Templates
Templates the advisor uses to issue preliminary quotations — one per machine variant. Pricing, scope items, technical specs, terms, and the email layout. Keep at least one active template per machine you want quotable.

### Users
Staff accounts. Three roles — admin, manager, agent. Admins invite, edit, or remove users.

### Settings
Operational configuration: SLA windows (working days and hours, first-response deadline, escalation lead time, escalation recipients), advisor default assignee, internal notification emails, quotation CC list, and backup health.`
  },

  {
    id: "user-flows",
    title: "User Flows",
    content: `Five flows cover most of the day-to-day work.

### 1. Lead lifecycle
A lead moves through stages from capture to close. Each stage change is recorded in the activity timeline with who, when, and what.

- **new** — Lead captured from the chatbot or contact form. Awaiting first staff touch.
- **quoted** — A preliminary quotation has been issued (by the advisor or by staff).
- **contact_scheduled** — Staff committed to a specific callback time.
- **contacted** — Staff logged a call outcome (any outcome counts).
- **qualified** — Buyer confirmed serious intent; ready for a formal proposal.
- **proposal_sent** — Formal proposal or PO sent.
- **won** — Deal closed positive.
- **lost** — Deal closed negative.

You can move a lead between stages from the workspace dropdown or by dragging on the board.

### 2. Quotation flow
1. Open the lead workspace.
2. Pick a quotation template that matches the machine.
3. Click **Issue quotation**.
4. The system generates a unique **reference number**, emails the buyer (when Resend is configured), and attaches the quotation to the lead.
5. The lead moves to the **quoted** stage automatically.

If the machine has multiple variants, you can issue a **variants** quotation listing all matching templates' prices in one document.

### 3. Chatbot grounding
This is how the advisor decides what to say.

1. Visitor question arrives at \`/api/advisor/recommend\`.
2. The pipeline matches the question against product specs, site sections, and active knowledge documents.
3. If at least one grounded source matches → Gemini generates an answer using **only** the matched context.
4. If nothing matches → the bot says it has no grounded information and offers a human handoff.
5. In parallel, the bot classifies intent: \`answer\`, \`quote\`, \`human\`, or \`custom_requirement\`. Quote intent triggers the quotation flow. Custom requirements produce an engineering brief for internal review.

The advisor never invents specs, prices, or lead times — if it isn't in an approved source, it won't be in the answer.

### 4. SLA escalation
Service-level enforcement runs automatically.

- **First-response SLA** is configurable in Settings — default is **2 working days** from lead capture.
- **Reminder** emails go out a configurable number of hours before the SLA expires.
- **Overdue** alerts trigger when the SLA is breached.
- **Escalation** emails go to the configured escalation recipients (typically managers and admins) after a further configurable window.
- The check runs **hourly** via the \`/api/sla-sweep\` cron.

### 5. Knowledge base flow
To add coverage for a topic the advisor currently can't answer:

1. Knowledge Base → **Add knowledge document**.
2. Set title, summary, and source type (text, PDF, or video).
3. **Paste the text the advisor should read into the Extracted Text field** — this is the actual grounding source.
4. Optionally upload a PDF/MP4 for human reference.
5. Save and toggle **active** to include the document in advisor grounding.`
  },

  {
    id: "glossary",
    title: "Glossary",
    content: `Definitions of every term used in the admin and the codebase.

**Advisor session** — One conversation between a visitor and the chatbot. Captured as a lead in the admin. Each session has a unique ID, the visitor's contact info, the question, the advisor's answer, and any quotation that resulted.

**Audit log** — Append-only record of every admin write operation: who changed what, when. Capped at 2,000 entries to prevent unbounded growth.

**Callback** — A specific date and time staff has committed to calling the buyer.

**Escalation** — When an SLA is breached past the escalation window, an email goes to the configured escalation recipients (typically managers and admins).

**Fallback** — Served when the AI is unavailable or returns nothing useful. A deterministic stitched-context answer is shown instead. Marked as \`provider: fallback\` in debug metadata.

**First-response SLA** — The SLA for the initial human contact after a lead is captured. Counts down from lead creation.

**Follow-up** — A general future-touch obligation without a specific committed time. Distinct from a callback.

**Grounded answer** — A chatbot answer that cites at least one approved source: a product spec, a site section, or an active knowledge document. The advisor refuses to answer when nothing is grounded.

**Intent** — The advisor's classification of a visitor message. One of \`answer\`, \`quote\`, \`human\`, or \`custom_requirement\`. Drives downstream behavior (e.g. quote triggers the quotation flow).

**Knowledge document** — A text source the advisor uses for grounding. Stored in Firestore. Toggling **active** controls whether it is used in answers.

**Lead** — A buyer who has interacted with Welden via the chatbot or contact form. Stored as an advisor session. Every lead has a stage, an owner, a temperature, and an activity timeline.

**Origin check** — Server-side check that POST requests came from the configured site URL. Blocks cross-domain abuse on the advisor, contact, and admin write endpoints.

**Outcome** — The result of a logged staff call. Examples: no answer, call back requested, needs more details, technical discussion needed, converted, lost.

**Preliminary quotation** — An AI-issued indicative price quote sent to the buyer based on a quotation template. Not a formal commercial offer — it is meant to start the commercial conversation.

**Quality flag** — Automated risk signal on a lead: disposable email, sequential phone number, placeholder name, etc. Shown in the lead workspace.

**Rate limit** — Per-IP request cap on the advisor and contact endpoints. Implemented in Firestore so it holds across serverless instances. Default for the advisor is **15 requests per 5 minutes** per IP.

**Reference number** — Unique identifier on every preliminary quotation. Format: \`WLDN/PQ/YYMM/NNN\`.

**SLA (Service Level Agreement)** — The promise of first staff response within a target window. Default: 2 working days. Triggers reminders, overdue alerts, and escalations.

**Stage** — The lead's position in the sales pipeline. Eight stages from \`new\` through to \`won\` or \`lost\`.

**Temperature** — A heuristic on lead heat (cold / warm / hot) based on quality, recency, and progress. Used to sort the queue.`
  },

  {
    id: "roles",
    title: "Roles and Permissions",
    content: `Three roles. Each user has exactly one.

### Admin
Full access. Manages users, settings, knowledge base, products, site content, quotation templates, and every lead. Runs backups. Can override anything in the system.

Reserve Admin for people who own platform configuration. Day-to-day operators do not need it.

### Manager
Leads, products, site content, quotation templates, and lead assignment. Cannot manage users, cannot change SLA settings, cannot run backups.

The default for senior sales and operations staff.

### Agent
Assigned leads only. Can log call outcomes, add notes, mark stage progress, and request quotations on their own leads. Cannot see other agents' leads. Cannot edit products or content.

The default for front-line sales staff.

### How role checks work
Every API write enforces the role server-side via \`requireApiUser\`. Hiding a button in the UI is not security; the backend is the gate. If an Agent tries to call an admin-only endpoint, the API returns 403 regardless of what the UI shows.`
  },

  {
    id: "faq",
    title: "FAQ",
    content: `### Why is the chatbot saying it has no information?
The advisor only answers from approved grounding sources. If a question doesn't match any product spec, site section, or active knowledge document, the bot refuses rather than guess. Fix it by adding a knowledge document (text type) covering that topic and setting it to **active**.

### The chatbot answer looks unformatted — I see raw \`**bold**\` or \`* bullets\`.
The chat UI parses Markdown. If you see raw asterisks, you are likely on a cached or old version of the site. Hard-refresh (Cmd/Ctrl+Shift+R) and check again. If the problem persists, confirm the latest \`master\` has been deployed.

### A lead came in with a fake-looking email or phone — what do I do?
Open the lead. Look at the Quality section: the system automatically flags disposable emails, sequential phone numbers, and placeholder names. If you can't reach the buyer, change the stage to **lost** with a note explaining why.

### Why are quotation emails not going out?
The Resend email service must be configured in production (\`RESEND_API_KEY\` and \`RESEND_SENDER_EMAIL\` set in the host environment). When email is missing, quotations are still generated and attached to the lead, but the email step is skipped. The Dashboard's deployment health card shows whether email is configured.

### How do I add a new machine?
Machines section → **Add machine** → fill the basics (title, slug, category, summary) → **Create**. The machine is created **unpublished**. Open it, build the landing card and detail page visually with reorderable blocks, then **publish** when it is ready for the public site.

### How do I change a lead's owner?
Open the lead → ownership panel → choose a user → save. The activity timeline records the change. Bulk reassignment is available from the lead table.

### A lead was missed past its SLA — what happened?
The SLA sweep runs hourly (\`/api/sla-sweep\`). If reminders or overdue alerts aren't being sent, check that \`CRON_SECRET\` is set, Resend is configured, and the **escalation recipients** list in Settings → SLA isn't empty.

### How do I undo a published change to a machine?
Edit the machine → restore the previous values → save as draft → publish. There is no one-click rollback; product publication is forward-only. For data emergencies, an admin can use **Firestore Point-in-Time Recovery** (7-day continuous recovery) — contact the platform owner.

### Why doesn't the chatbot use my uploaded PDF?
Currently the advisor reads the **Extracted Text** field of a knowledge document, not the PDF file itself. PDF-content grounding is a future enhancement. Paste the relevant text into Extracted Text; that is what the bot will use for answers.

### What is the difference between a "lead" and an "advisor session"?
They are the same record in this app. Every chatbot conversation becomes an advisor session, which is also the lead. The two names reflect history: \`advisor\` is the chatbot, \`session\` is the conversation, and the conversation is what becomes the lead.

### Why does the advisor refuse to discuss something the buyer asks about?
By design. Grounding-only answers protect against hallucinated specs, prices, and lead times. If the bot is refusing on a topic you want covered, add a knowledge document with the right text and set it active. The bot will pick it up on the next conversation.`
  }
];
