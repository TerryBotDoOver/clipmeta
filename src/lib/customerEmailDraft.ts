import OpenAI from "openai";

type DraftInput = {
  from: string;
  subject: string;
  body: string;
};

const fallbackDraft = ({ subject }: DraftInput) => `Hi,

Thanks for reaching out. I saw your message about "${subject || "ClipMeta"}" and I am going to take a closer look.

I will follow up shortly with a more complete answer.

Terry`;

export async function draftCustomerEmail(input: DraftInput) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const body = input.body.trim();

  if (!apiKey || !body) {
    return fallbackDraft(input);
  }

  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 450,
    messages: [
      {
        role: "system",
        content:
          "You draft concise, helpful customer support replies for ClipMeta, a SaaS for stock footage metadata. Do not promise work is done unless the email proves it. Ask one clear question if needed. Sign exactly as Terry.",
      },
      {
        role: "user",
        content: [
          `From: ${input.from}`,
          `Subject: ${input.subject || "(no subject)"}`,
          "",
          "Customer email:",
          body.slice(0, 6000),
        ].join("\n"),
      },
    ],
  });

  const draft = response.choices[0]?.message?.content?.trim();
  return draft || fallbackDraft(input);
}
