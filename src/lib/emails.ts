type WrapperOptions = { transactional?: boolean };

const emailWrapper = (content: string, opts: WrapperOptions = {}) => {
  // Transactional emails (receipts, account notifications) do not include an
  // unsubscribe link. Marketing/lifecycle emails get {{unsubscribe_url}} which
  // the send path substitutes with a per-recipient signed URL.
  const footer = opts.transactional
    ? `<p style="color:#71717a;font-size:13px;margin:0;">ClipMeta - AI metadata for stock footage</p>`
    : `<p style="color:#71717a;font-size:13px;margin:0 0 8px 0;">ClipMeta - AI metadata for stock footage</p>
              <a href="{{unsubscribe_url}}" style="color:#52525b;font-size:12px;text-decoration:underline;">Unsubscribe</a>`;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ClipMeta</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="color:#fafafa;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Clip<span style="color:#8b5cf6;">Meta</span></span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#18181b;border-radius:12px;padding:40px 36px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

const ctaButton = (text: string, url: string) =>
  `<div style="text-align:center;margin-top:28px;"><a href="${url}" style="display:inline-block;background-color:#8b5cf6;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:8px;">${text}</a></div>`;

const h1 = (text: string) =>
  `<h1 style="color:#fafafa;font-size:24px;font-weight:700;margin:0 0 20px 0;line-height:1.3;">${text}</h1>`;

const p = (text: string) =>
  `<p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 16px 0;">${text}</p>`;

// ─── Email 1: Welcome ───────────────────────────────────────────────────────

export function welcomeEmail(name: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    ${h1(`Welcome to ClipMeta, ${firstName}!`)}
    ${p('You get 3 free clips every day, no credit card needed.')}
    ${p('Upload your first clip and watch AI generate your metadata in seconds.')}
    ${ctaButton('Upload Your First Clip', 'https://clipmeta.app/projects/new')}
    ${p('If you have any questions, concerns, or feature requests, use the Feedback tab in the app or reply to this email. We read everything.')}
  `;
  return {
    subject: 'Your first 3 clips are on us',
    html: emailWrapper(content),
  };
}

// ─── Email 2a: Quick Win (uploaded) ────────────────────────────────────────

export function quickWinUploadedEmail(name: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    ${h1(`Nice work, ${firstName}.`)}
    ${p('You uploaded your first clip and the AI metadata is ready.')}
    ${p('Head to your project to review the title, description, and keywords. Edit anything you want, then export.')}
    ${ctaButton('Review Your Metadata', 'https://clipmeta.app/projects')}
    ${p('Questions or feature requests? Use the Feedback tab in the app or reply to this email.')}
  `;
  return {
    subject: 'Your metadata is ready to review',
    html: emailWrapper(content),
  };
}

// ─── Email 2b: Quick Win (no upload yet) ───────────────────────────────────

export function quickWinNoUploadEmail(name: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    ${h1(`Hey ${firstName}, here's what happens when you upload a clip:`)}
    <ol style="color:#a1a1aa;font-size:15px;line-height:2;margin:0 0 16px 0;padding-left:20px;">
      <li>Upload any video clip</li>
      <li>AI watches it and writes the title, description, and 35+ keywords</li>
      <li>Review everything, then export a ready-to-upload CSV</li>
    </ol>
    ${p('The whole thing takes about 30 seconds per clip.')}
    ${ctaButton('Try It Now', 'https://clipmeta.app/projects/new')}
  `;
  return {
    subject: 'See ClipMeta in action (30 seconds)',
    html: emailWrapper(content),
  };
}

// ─── Email 3: Platform Export ───────────────────────────────────────────────

export function platformExportEmail(name: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    ${h1(`Hey ${firstName}.`)}
    ${p('Most metadata tools give you a generic CSV. ClipMeta formats it exactly how each platform wants it.')}
    ${p('Blackbox.global, Shutterstock, Adobe Stock, Pond5. Right column names, right format, every time.')}
    ${p('No more reformatting spreadsheets.')}
    ${ctaButton('Try a Platform Export', 'https://clipmeta.app/projects')}
  `;
  return {
    subject: 'Export directly to Blackbox, Shutterstock, or Adobe Stock',
    html: emailWrapper(content),
  };
}

// ─── Email 4: Social Proof ──────────────────────────────────────────────────

export function socialProofEmail(name: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    ${h1(`Hey ${firstName}.`)}
    ${p('One contributor changed nothing about their footage. Same clips, same platforms.')}
    ${p('The only thing they changed was the metadata.')}
    ${p('Result: More visibility, more downloads, more revenue.')}
    ${p('Good metadata isn\'t optional. It\'s the difference between your clips getting found or sitting invisible.')}
    ${ctaButton('Generate Better Metadata', 'https://clipmeta.app/projects/new')}
  `;
  return {
    subject: 'Same footage. Better metadata. More sales.',
    html: emailWrapper(content),
  };
}

// ─── Email 5: Limit Nudge ───────────────────────────────────────────────────

export function limitNudgeEmail(name: string, clipsUsed: number): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    ${h1(`Hey ${firstName}, you've used ${clipsUsed} free clips this week.`)}
    ${p('3 clips a day is great for testing. But if you have a backlog of 50, 100, or 500 clips...')}
    ${p('Plans start at $9/mo for 140 clips. Pro gets you 320.')}
    ${p('And here\'s something for being an early user:')}
    <p style="color:#fafafa;font-size:15px;font-weight:700;line-height:1.7;margin:0 0 16px 0;">Use code FOUNDING50 for 50% off your first 3 months.</p>
    ${ctaButton('See Plans', 'https://clipmeta.app/pricing')}
  `;
  return {
    subject: `You've used ${clipsUsed} free clips this week`,
    html: emailWrapper(content),
  };
}

// ─── Email 6: Founder Note ──────────────────────────────────────────────────

export function founderNoteEmail(name: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 16px 0;">Hey ${firstName},</p>
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 16px 0;">We built ClipMeta because we were spending hours keywording our own drone footage. We figured there had to be a better way.</p>
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 16px 0;">Quick question: what's your biggest frustration with stock footage metadata? We read every reply.</p>
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 16px 0;">And if you haven't tried ClipMeta yet, your code FOUNDING50 still works. 50% off for 3 months.</p>
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 16px 0;">If you have any questions, concerns, or feature requests, use the Feedback tab in the app or just reply to this email.</p>
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 8px 0;">Thanks,</p>
    <p style="color:#fafafa;font-size:15px;font-weight:600;line-height:1.7;margin:0;">The ClipMeta Team</p>
  `;
  return {
    subject: 'Quick question from the ClipMeta team',
    html: emailWrapper(content),
  };
}

// ─── Email 7: Urgency ───────────────────────────────────────────────────────

export function urgencyEmail(name: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    ${h1(`Hey ${firstName}, your 50% discount is about to expire.`)}
    ${p('FOUNDING50 gets you 50% off your first 3 months. That\'s Pro at $9.50/mo instead of $19.')}
    ${p('This code is only for our first 100 users. Once it\'s gone, it\'s gone.')}
    ${ctaButton('Lock In Your Founding Rate', 'https://clipmeta.app/pricing')}
  `;
  return {
    subject: 'Your FOUNDING50 code expires in 48 hours',
    html: emailWrapper(content),
  };
}

// ─── Email 8: Last Chance ───────────────────────────────────────────────────

export function lastChanceEmail(name: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    ${h1(`Last call, ${firstName}.`)}
    ${p('Your founding member discount expires tonight at midnight.')}
    ${p('50% off for 3 months. Last chance.')}
    ${ctaButton('Use FOUNDING50 Now', 'https://clipmeta.app/pricing')}
  `;
  return {
    subject: `Last call, ${firstName}`,
    html: emailWrapper(content),
  };
}

// ─── Email 9: Win Back ──────────────────────────────────────────────────────

export function winBackEmail(name: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    ${h1(`Hey ${firstName}, we've been busy.`)}
    ${p('Here\'s what\'s new since you signed up:')}
    <ul style="color:#a1a1aa;font-size:15px;line-height:2;margin:0 0 16px 0;padding-left:20px;">
      <li>Clip rollover - unused clips carry over to the next month</li>
      <li>Referral program - share ClipMeta and get free clips</li>
      <li>Improved keyword tools - more targeted, more relevant results</li>
    </ul>
    ${p('And because we want you to give it a real shot:')}
    <p style="color:#fafafa;font-size:15px;font-weight:700;line-height:1.7;margin:0 0 16px 0;">Your first month is free. Use code FIRSTFREE at checkout.</p>
    ${ctaButton('Start Your Free Month', 'https://clipmeta.app/pricing')}
  `;
  return {
    subject: 'Something new you might want to see',
    html: emailWrapper(content),
  };
}

// ─── Email 10: Breakup ──────────────────────────────────────────────────────

export function breakupEmail(name: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    ${h1(`Hey ${firstName}.`)}
    ${p('We don\'t want to be the annoying SaaS that won\'t leave you alone.')}
    ${p('If stock footage metadata isn\'t a pain point for you, no hard feelings. Hit unsubscribe below.')}
    ${p('But if it IS still eating your time, we\'re here. And this is the best deal we\'ll ever offer:')}
    <p style="color:#fafafa;font-size:15px;font-weight:700;line-height:1.7;margin:0 0 16px 0;">Code COMEBACK gets you 60% off. Just for you.</p>
    ${ctaButton('One Last Look', 'https://clipmeta.app/pricing')}
    <p style="color:#71717a;font-size:13px;margin:16px 0 0 0;text-align:center;">This is our last email unless you log back in.</p>
  `;
  return {
    subject: 'Should I stop emailing you?',
    html: emailWrapper(content),
  };
}

// ─── Legacy aliases (kept so old imports don't break) ──────────────────────

export function day3Email(name: string) { return platformExportEmail(name); }
export function day7Email(name: string) { return limitNudgeEmail(name, 0); }
export function day14Email(name: string) { return urgencyEmail(name); }

// ─── Track 2: Paid/Trialing Drip ────────────────────────────────────────────

// paid_day0 — immediate on track switch
export function paidDay0Email(name: string, plan: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'paid';
  const content = `
    ${h1(`You're in, ${firstName}.`)}
    ${p(`You're on the ${planLabel} plan. Here's how to get your first win in under 5 minutes:`)}
    <ol style="color:#a1a1aa;font-size:15px;line-height:2;margin:0 0 16px 0;padding-left:20px;">
      <li>Create a project</li>
      <li>Upload 5 clips</li>
      <li>Hit Generate</li>
    </ol>
    ${p("You'll have platform-ready metadata in under 2 minutes. Any questions? Just reply to this email.")}
    ${ctaButton('Get Started', 'https://clipmeta.app/projects/new')}
  `;
  return {
    subject: "You're in — here's your first win in 5 minutes",
    html: emailWrapper(content),
  };
}

// paid_day2
export function paidDay2Email(name: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    ${h1(`The metadata trick most stock creators miss.`)}
    ${p(`Hey ${firstName} — most creators use generic keywords. ClipMeta lets you pick your platform preset (Blackbox, Pond5, Adobe Stock, Shutterstock) — each one uses that platform's exact taxonomy and keyword format.`)}
    ${p("Worth double-checking your project settings to make sure you're targeting the right platform.")}
    ${ctaButton('Check Project Settings', 'https://clipmeta.app/projects')}
  `;
  return {
    subject: 'The metadata trick most stock creators miss',
    html: emailWrapper(content),
  };
}

// paid_day5
export function paidDay5Email(name: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 16px 0;">Hey ${firstName},</p>
    ${p("Just checking in — are you getting what you need from ClipMeta?")}
    ${p("If anything is confusing or not working right, reply to this email. We read everything.")}
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 8px 0;">— The ClipMeta Team</p>
  `;
  return {
    subject: 'Quick check-in',
    html: emailWrapper(content),
  };
}

// paid_day6_trial — trial users only
export function paidDay6TrialEmail(name: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 16px 0;">Hey ${firstName},</p>
    ${p("Your 7-day free trial ends tomorrow.")}
    ${p("You won't be charged anything if you cancel before then — just go to Settings → Billing.")}
    ${p("If you want to keep going, no action needed. Either way, hope ClipMeta saved you some time this week.")}
    ${ctaButton('Manage Billing', 'https://clipmeta.app/settings')}
  `;
  return {
    subject: 'Your trial ends tomorrow',
    html: emailWrapper(content),
  };
}

// paid_day8
export function paidDay8Email(name: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 16px 0;">Hey ${firstName},</p>
    ${p("Quick question — which stock sites do you actively sell on?")}
    ${p("We're always improving ClipMeta's platform support. Just hit reply — takes 10 seconds and directly shapes what we build next.")}
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 8px 0;">— The ClipMeta Team</p>
  `;
  return {
    subject: 'Quick question — which platforms do you upload to?',
    html: emailWrapper(content),
  };
}

// paid_day21
export function paidDay21Email(name: string): { subject: string; html: string } {
  const firstName = name || 'there';
  const content = `
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 16px 0;">Hey ${firstName},</p>
    ${p("You've been using ClipMeta for a few weeks now. We'd love to know: what's working well, and what could be better?")}
    ${p("Honest feedback welcome. We're a small team and we read every reply.")}
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 8px 0;">— The ClipMeta Team</p>
  `;
  return {
    subject: "How's it going with ClipMeta?",
    html: emailWrapper(content),
  };
}

// paid_day50
export function paidDay50Email(name: string, clipCount?: number): { subject: string; html: string } {
  const firstName = name || 'there';
  const statsLine = clipCount && clipCount > 0
    ? `You've processed ${clipCount} clip${clipCount === 1 ? '' : 's'} so far.`
    : "You've been putting ClipMeta to work.";
  const content = `
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 16px 0;">Hey ${firstName},</p>
    ${p(`Quick update from the ClipMeta team. ${statsLine}`)}
    ${p("We've been heads-down building improvements based on feedback from customers like you. More to come soon.")}
    ${p("Thanks for being a customer — it genuinely means a lot.")}
    <p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 8px 0;">— The ClipMeta Team</p>
  `;
  return {
    subject: 'Your ClipMeta stats + what\'s coming next',
    html: emailWrapper(content),
  };
}

// ─── Receipt Email ──────────────────────────────────────────────────────────

interface ReceiptDetails {
  customerEmail: string;
  customerName?: string;
  amount: number;
  currency?: string;
  description: string;
  date: string;
  paymentMethod?: string;
  receiptNumber?: string;   // Stripe receipt_number or charge ID
  isSubscription?: boolean;
  planName?: string;
}

export function receiptEmail(details: ReceiptDetails): { subject: string; html: string } {
  const firstName = details.customerName?.split(' ')[0] || 'there';
  const currencySymbol = (details.currency || 'usd') === 'usd' ? '$' : details.currency?.toUpperCase() + ' ';
  const formattedAmount = `${currencySymbol}${details.amount.toFixed(2)}`;
  const receiptNum = details.receiptNumber || '';

  const receiptRow = (label: string, value: string, bold = false) =>
    `<tr>
      <td style="padding:12px 0;border-bottom:1px solid #27272a;color:#a1a1aa;font-size:14px;">${label}</td>
      <td style="padding:12px 0;border-bottom:1px solid #27272a;color:#fafafa;font-size:14px;text-align:right;${bold ? 'font-weight:700;font-size:16px;' : ''}">${value}</td>
    </tr>`;

  const content = `
    ${h1(`Receipt for your purchase`)}
    ${receiptNum ? `<p style="color:#71717a;font-size:13px;margin:0 0 20px 0;">Receipt #${receiptNum}</p>` : ''}
    ${p(`Hi ${firstName}, thanks for your purchase! Here's your receipt.`)}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      ${receiptRow('Item', details.description)}
      ${receiptRow('Date', details.date)}
      ${details.paymentMethod ? receiptRow('Payment', details.paymentMethod) : ''}
      ${receiptNum ? receiptRow('Receipt #', receiptNum) : ''}
      ${receiptRow('Amount paid', formattedAmount, true)}
    </table>

    ${p('If you have any questions about this charge, just reply to this email.')}

    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #27272a;">
      <p style="color:#52525b;font-size:12px;line-height:1.6;margin:0;">
        ClipMeta · AI metadata for stock footage<br>
        hello@clipmeta.app
      </p>
    </div>
  `;

  const subjectLine = details.isSubscription
    ? `Your ClipMeta ${details.planName || ''} subscription receipt — ${formattedAmount}`
    : `Your ClipMeta receipt — ${formattedAmount}`;

  return {
    subject: subjectLine,
    html: emailWrapper(content, { transactional: true }),
  };
}

// ─── Email: Archive Warning ────────────────────────────────────────────────
// Transactional. Sent when one or more of the user's uploaded source clips
// is 7 days from being auto-archived from R2 storage. Metadata is preserved
// permanently; only the playable source disappears. We tell users so they
// can finalize export or download originals before they're gone.

export function archiveWarningEmail(
  name: string,
  details: {
    clipCount: number;
    daysLeft: number;
    projects: { name: string; slug: string; clipsAtRisk: number }[];
  }
): { subject: string; html: string } {
  const firstName = name || 'there';
  const { clipCount, daysLeft, projects } = details;
  const clipNoun = clipCount === 1 ? 'clip' : 'clips';
  const projectNoun = projects.length === 1 ? 'project' : 'projects';

  const projectList = projects
    .map(
      (proj) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #27272a;">
            <a href="https://clipmeta.app/projects/${proj.slug}/review" style="color:#fafafa;text-decoration:none;font-weight:600;font-size:14px;">${escapeHtml(proj.name)}</a>
          </td>
          <td style="padding:10px 14px;border-bottom:1px solid #27272a;text-align:right;color:#a1a1aa;font-size:14px;">
            ${proj.clipsAtRisk} ${proj.clipsAtRisk === 1 ? 'clip' : 'clips'}
          </td>
        </tr>`
    )
    .join('');

  const content = `
    ${h1(`${clipCount} ${clipNoun} archive in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`)}
    ${p(`Hey ${firstName},`)}
    ${p(`Heads up — ${clipCount} of your uploaded source ${clipNoun} across ${projects.length} ${projectNoun} will be auto-archived from storage in ~${daysLeft} day${daysLeft === 1 ? '' : 's'}.`)}
    ${p(`<strong style="color:#fafafa;">Your metadata, thumbnails, and exports stay forever.</strong> Only the playable source video files are removed to keep storage costs low.`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f12;border-radius:8px;margin:8px 0 24px 0;">
      ${projectList}
    </table>
    ${p(`If you still need to regenerate metadata or download originals, do it before the archive window closes.`)}
    ${ctaButton('Open ClipMeta', 'https://clipmeta.app/projects')}
    <p style="color:#71717a;font-size:13px;line-height:1.6;margin:16px 0 0 0;">Sources are auto-archived 21 days after upload. This is a one-time notice for these clips.</p>
  `;

  return {
    subject: `${clipCount} ${clipNoun} archive in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — ClipMeta`,
    html: emailWrapper(content, { transactional: true }),
  };
}

// ─── Email: Idle Project Reminder ──────────────────────────────────────────
// Transactional. Sent once per project when it goes 30+ days without
// activity AND still has clips (especially clips with metadata that hasn't
// been exported). Nudges the user to wrap things up before sources archive.

export function idleProjectEmail(
  name: string,
  details: {
    projectName: string;
    projectSlug: string;
    daysIdle: number;
    totalClips: number;
    clipsWithMetadata: number;
    clipsExpiringSoon: number;
  }
): { subject: string; html: string } {
  const firstName = name || 'there';
  const { projectName, projectSlug, daysIdle, totalClips, clipsWithMetadata, clipsExpiringSoon } = details;

  const expiringLine =
    clipsExpiringSoon > 0
      ? `<p style="color:#fbbf24;font-size:14px;line-height:1.6;margin:0 0 16px 0;background-color:#422006;padding:12px 14px;border-radius:6px;border:1px solid #92400e;">⚠️ ${clipsExpiringSoon} ${clipsExpiringSoon === 1 ? 'source file is' : 'source files are'} within 7 days of being auto-archived from storage.</p>`
      : '';

  const content = `
    ${h1(`Your project "${escapeHtml(projectName)}" has been quiet`)}
    ${p(`Hey ${firstName},`)}
    ${p(`Your project <strong style="color:#fafafa;">${escapeHtml(projectName)}</strong> hasn&apos;t had any activity for ${daysIdle} days. It still has ${totalClips} ${totalClips === 1 ? 'clip' : 'clips'} (${clipsWithMetadata} with metadata).`)}
    ${expiringLine}
    ${p(`If you&apos;re done with this project, finalize the export now. If you&apos;ve moved on, no action needed — your metadata stays saved.`)}
    ${ctaButton('Open Project', `https://clipmeta.app/projects/${projectSlug}/review`)}
    <p style="color:#71717a;font-size:13px;line-height:1.6;margin:16px 0 0 0;">This is a one-time reminder. We won&apos;t nag you about this project again.</p>
  `;

  return {
    subject: `${projectName}: idle for ${daysIdle} days`,
    html: emailWrapper(content, { transactional: true }),
  };
}

// Minimal HTML escaper for project names that may contain user input.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
