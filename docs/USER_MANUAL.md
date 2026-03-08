# Vanto Zazi Mail — User Manual

**Version:** 1.0  
**Last Updated:** 8 March 2026

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Managing Subscribers](#3-managing-subscribers)
4. [Sending Broadcasts](#4-sending-broadcasts)
5. [A/B Testing](#5-ab-testing)
6. [Email Sequences](#6-email-sequences)
7. [Automations](#7-automations)
8. [Templates](#8-templates)
9. [Segments & Tags](#9-segments--tags)
10. [Forms & Landing Pages](#10-forms--landing-pages)
11. [Analytics](#11-analytics)
12. [Knowledge Base](#12-knowledge-base)
13. [Plan Hub](#13-plan-hub)
14. [Settings](#14-settings)
15. [Integrations](#15-integrations)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Getting Started

### Creating Your Account

1. Navigate to the application URL
2. Click **Sign Up** on the login page
3. Enter your email address and a strong password
4. Check your email for a verification link and confirm your account
5. Log in with your credentials

### First Login

After logging in, you'll land on the **Dashboard**. From here you can:
- View your subscriber count and email performance stats
- Navigate to any section using the left sidebar
- Create your first broadcast by clicking **New Broadcast** in the sidebar

---

## 2. Dashboard Overview

The dashboard is your home screen. It shows:

- **Stats Cards** — Total Subscribers, Emails Sent, Open Rate, Click Rate
- **Recent Broadcasts** — Your last 5 campaigns with status indicators:
  - 🟢 Sent — Delivered to recipients
  - 🔵 Scheduled — Queued for future delivery
  - ⚫ Draft — Not yet sent
- **New Subscribers** — The latest people who joined your list
- **Subscriber Growth Chart** — A visual timeline of list growth

### Dark Mode

Click the 🌙/☀️ icon in the top header to toggle dark mode. Your preference is saved automatically.

---

## 3. Managing Subscribers

Navigate to **Subscribers** in the sidebar.

### Viewing Subscribers

- Subscribers are displayed in a paginated table (25 per page)
- Use the **search bar** to find subscribers by name or email
- Each subscriber shows their engagement score (🔥 icon), source, and join date

### Adding Subscribers

**Manually:** Subscribers are added when they fill out a public form (Welcome Form or Sequence Form).

**Import from CSV:**
1. Click the **Import** button
2. Drag and drop a CSV file or click to browse
3. Map CSV columns to fields (email, first_name)
4. Confirm the import

### Exporting Subscribers

1. Click the **Export** button
2. Choose format: CSV or JSON
3. The file downloads immediately

### Tagging Subscribers

1. Click on a subscriber row to open their detail
2. Click **+ Add Tag** 
3. Select an existing tag or create a new one
4. Tags are used for segmentation and automation triggers

### Removing Subscribers

- Click the 🗑️ delete icon next to a subscriber to remove them
- Use the checkbox column for bulk selection

### Unsubscribe Handling

When a subscriber clicks the unsubscribe link in an email, they are automatically marked as unsubscribed and excluded from future sends.

---

## 4. Sending Broadcasts

### Creating a New Broadcast

1. Click **New Broadcast** in the sidebar (or the + button on the Broadcasts page)
2. Fill in the details:
   - **Subject Line** — The email subject your subscribers will see
   - **From Name** — Who the email appears to come from
   - **Reply-To** — The email address for replies
   - **Preview Text** — Short text shown in inbox previews
   - **Brand** — Select Vanto or APLGO
3. **Write your email** using the visual editor:
   - Use the toolbar for bold, italic, links, images, and formatting
   - Switch to HTML mode for advanced editing
4. **Select recipients:**
   - All subscribers (default)
   - A specific segment
5. **Send or Schedule:**
   - Click **Send Now** to deliver immediately
   - Click **Schedule** to pick a future date and time

### Viewing Broadcasts

Navigate to **Broadcasts** to see all campaigns:
- Filter by status: All, Sent, Scheduled, Drafts
- Click the stats icon (📊) on a sent broadcast to see opens, clicks, and bounces
- Delete drafts or failed broadcasts with the 🗑️ icon

---

## 5. A/B Testing

### Creating an A/B Test

1. Navigate to **Broadcasts → A/B Test**
2. Create your test:
   - Define **Variant A** and **Variant B** (different subject lines or content)
   - Set the **test size** (percentage of subscribers who receive the test)
   - Set the **duration** (hours to wait before picking a winner)
   - Choose the **winning metric** (open rate or click rate)
3. Start the test
4. After the duration, the winning variant is automatically sent to the remaining subscribers

---

## 6. Email Sequences

Sequences are multi-step automated email series that subscribers receive over time.

### Creating a Sequence

1. Navigate to **Sequences** in the sidebar
2. Click **+ New Sequence**
3. Fill in:
   - **Name** — Internal name for the sequence
   - **Description** — What this sequence does
   - **Brand** — Vanto or APLGO
4. **Add Steps:**
   - Each step has a subject line, email content, and a delay (in days)
   - Steps are sent in order, with the configured delay between each
5. Save and set status to **Active**

### Enrolling Subscribers

- Use the **Batch Enrol** button to add existing subscribers to a sequence
- Subscribers who join via a sequence form are enrolled automatically
- Each subscriber progresses through steps independently

### Sharing Sequence Forms

1. Go to **Forms** in the sidebar
2. Find your sequence and click **Copy Link**
3. Share the link — anyone who fills it in joins the sequence automatically

---

## 7. Automations

Automations trigger actions based on subscriber behaviour.

### Creating an Automation

1. Navigate to **Automations** in the sidebar
2. Click **+ New Automation**
3. Choose a **trigger**:
   - When someone subscribes
   - When a tag is added
   - When a purchase is made
   - When a link is clicked
   - On a specific date
4. Build the **workflow steps**:
   - Send Email — Compose and send an email
   - Wait — Pause for a specified duration
   - Add Tag — Apply a tag to the subscriber
   - Condition — Branch based on criteria
5. **Activate** the automation

### Managing Automations

- **Pause** — Temporarily stop the automation
- **Resume** — Reactivate a paused automation
- **Delete** — Remove the automation entirely
- View automation status and last update time

---

## 8. Templates

### Using Templates

1. Navigate to **Templates** in the sidebar
2. Browse or search templates by category
3. Click a template to preview it
4. Click **Use Template** when composing a broadcast to insert its content

### Creating Templates

1. Click **+ New Template**
2. Fill in:
   - **Name** — Template name
   - **Category** — Newsletter, Promotion, Welcome, Announcement, etc.
   - **Subject** — Default subject line
   - **Content** — Email body (HTML supported)
3. Save the template

### Duplicating Templates

Click the **⋯** menu on any template and select **Duplicate** to create a copy you can modify.

---

## 9. Segments & Tags

### Creating Segments

1. Navigate to **Segments** in the sidebar
2. Click **+ New Segment**
3. Define filter rules:
   - **Tag-based** — Has or doesn't have specific tags
   - **Date-based** — Joined before/after a date
   - **Engagement-based** — Score above/below a threshold
4. Save the segment — subscriber count updates automatically

### Using Segments

- Select a segment when creating a broadcast to target specific subscribers
- Segments are dynamic — subscribers matching the rules are always up to date

### Managing Tags

1. Go to the **Tags** tab within Segments
2. Create tags with custom names and colours
3. Apply tags to subscribers from the Subscribers page
4. Tags power segment filters and automation triggers

---

## 10. Forms & Landing Pages

### Available Forms

| Form | URL | Purpose |
|------|-----|---------|
| Welcome Form | `/forms/welcome` | General newsletter signup |
| Sequence Forms | `/forms/sequence/:id` | Join a specific email sequence |
| VantoOS Beta | `/forms/vantoos-beta` | Executive Beta application |

### Sharing Forms

1. Navigate to **Forms** in the sidebar
2. Click the **Copy Link** icon next to any form
3. Share the URL on your website, social media, or via email

### What Happens When Someone Submits

1. Their information is saved as a new prospect (subscriber)
2. If it's a sequence form, they are automatically enrolled in that sequence
3. Any "on subscribe" automations are triggered
4. They appear in your subscriber list immediately

---

## 11. Analytics

Navigate to **Analytics** in the sidebar for a comprehensive view of your email performance.

### Metrics Explained

| Metric | What It Means |
|--------|--------------|
| **Total Subscribers** | Number of people on your list |
| **Emails Sent** | Total emails dispatched |
| **Delivered** | Successfully landed in inbox |
| **Bounced** | Failed to deliver (invalid address, full inbox) |
| **Opened** | Recipient opened the email |
| **Clicked** | Recipient clicked a link in the email |
| **Complained** | Recipient marked as spam |
| **Open Rate** | Opens ÷ Sent × 100 |
| **Click Rate** | Clicks ÷ Sent × 100 |

### Charts

- **Engagement Distribution** — Breakdown of subscriber engagement scores
- **Delivery Performance** — Pie chart of delivered vs bounced vs complained

---

## 12. Knowledge Base

The Knowledge Base powers the AI Copilot with your own training documents.

### Uploading Files

1. Navigate to **Knowledge Base** in the sidebar
2. Select a **Collection** (e.g. "APLGO Products & Benefits")
3. Click **Choose File** and select a PDF, DOCX, TXT, or CSV
4. The file uploads and begins processing automatically

### File Processing Status

| Status | Meaning |
|--------|---------|
| ⏳ Queued | Waiting to be processed |
| 🔄 Processing | Being chunked and indexed |
| ✅ Ready | Searchable by the Copilot |
| ❌ Failed | Processing error — try re-processing |

### Testing the Knowledge Base

1. Use the **Ask KB** panel on the right side
2. Type a question (e.g. "What are the PV requirements for Gold rank?")
3. The system retrieves relevant chunks and generates an answer
4. Rate the answer as 👍 Helpful or 👎 Not Helpful to improve quality

### Managing Files

- **Re-process** — Click the 🔄 icon to re-ingest a file
- **Delete** — Click the 🗑️ icon to remove a file and its chunks
- **Filter** — Use collection filter buttons to narrow the file list

### Collections

Files are organised into 8 collections:
1. APLGO Business & Compensation
2. APLGO Products & Benefits
3. Pricing, PV, VAT, Bonuses
4. Scripts & Templates (WhatsApp/Email)
5. Compliance & Disclaimers
6. Online Course
7. MLM Motivation
8. Personality Code

---

## 13. Plan Hub

The Plan Hub is your personal command centre for daily productivity.

### Accessing Plan Hub

Navigate to **Plan** in the sidebar.

### Tabs

#### Today
Shows a unified view of today's tasks, reminders, and meetings in one screen.

#### Tasks
- Click **+ New Task** to create a task
- Set priority (low, medium, high), due date, and estimated time
- Check off completed tasks
- Reorder tasks by dragging (if supported) or editing order

#### Reminders
- Create time-based reminders
- Mark reminders as done when completed
- Past-due reminders are highlighted

#### Meetings
- Add meetings with title, start time, location, and attendees
- Add notes to meetings
- View upcoming meetings chronologically

#### Calendar
- Monthly calendar view with dots indicating days with events
- Click a day to see its tasks, reminders, and meetings

#### Notes
- Daily journal entries
- Toggle between freeform and structured modes
- Add reference links to notes

### Command Bar (⌘K)

Press `⌘K` (Mac) or `Ctrl+K` (Windows) anywhere on the Plan page to open the command bar:
- Quickly search through tasks, reminders, and meetings
- Jump to create new items
- Navigate between tabs

### Voice Input

Click the 🎙️ mic button to dictate:
1. Speak your intent (e.g. "Remind me to call John at 3pm" or "Add a task to review the proposal")
2. AI extracts the intent and pre-fills the form
3. Confirm to create the item

### Insider Panel

On desktop, the right-side panel shows contextual AI tips and suggestions based on your current tab.

---

## 14. Settings

Navigate to **Settings** in the sidebar.

### Profile Tab
- **Display Name** — Your name shown in the dashboard
- **Company** — Your organisation name
- **Website** — Your website URL
- **Timezone** — Used for scheduling broadcasts and reminders

### Email Tab
- **From Name** — Default sender name for emails
- **Reply-To Address** — Where replies go
- **Brand** — Default brand for new broadcasts
- **Email Signature** — Rich signature appended to emails (live preview)

### Notifications Tab
Toggle on/off:
- Email digest
- New subscriber alerts
- Weekly performance reports
- Product updates
- Marketing emails

### Appearance Tab
- Toggle between **Light** and **Dark** mode
- Theme preference is saved locally

---

## 15. Integrations

Navigate to **Integrations** in the sidebar.

Browse available integrations across categories:
- **E-Commerce:** Shopify, WooCommerce, Gumroad
- **Payments:** Stripe
- **Scheduling:** Calendly
- **Communication:** Slack, Discord
- **CMS:** WordPress
- **Analytics:** Google Analytics
- **Design:** Canva
- **Video:** YouTube, Zoom
- **Audio:** Spotify
- **Automation:** Zapier, Make

> **Note:** Integration connections are planned for a future release. The integration page currently shows available connectors.

---

## 16. Troubleshooting

### I can't log in
- Ensure you verified your email address after signup
- Check that caps lock is off
- Try resetting your password

### My broadcast shows "failed"
- Check that your email delivery service is configured
- Verify that subscribers have valid email addresses
- Look at the broadcast's error details

### Files stuck in "processing" in Knowledge Base
- Click the 🔄 re-process button
- Ensure the file is a supported format (PDF, DOCX, TXT, CSV)
- Very large files may take longer to process

### Subscribers not appearing after import
- Verify CSV has an "email" column header
- Check that email addresses are valid
- Duplicate emails are skipped automatically

### Voice input not working in Plan Hub
- Ensure your browser has microphone permissions enabled
- Voice input works best in Chrome and Edge
- Check that your device microphone is not muted

### Dark mode not persisting
- Dark mode is saved to your browser's local storage
- Clearing browser data will reset the preference

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open Command Bar (Plan page) |
| Theme toggle | Click moon/sun icon in header |

---

## Support

For questions, feedback, or issues, contact the Vanto team.

---

© 2026 Vanto. All rights reserved.
