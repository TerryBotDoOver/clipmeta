type DiscordMessageOptions = {
  channelId: string;
  content: string;
};

export const DISCORD_CHANNELS = {
  inbox: "1485454655524962495",
  emailApprovals: "1485669162171760741",
  feedback: "1484279405646844004",
  signups: "1484408994356531371",
  payments: "1502152652799217664",
  ops: "1482069898409541715",
} as const;

export function truncateForDiscord(value: string, maxLength = 1800) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 20)).trimEnd()}\n... truncated`;
}

export async function sendDiscordMessage({ channelId, content }: DiscordMessageOptions) {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) {
    console.warn("[discord] DISCORD_BOT_TOKEN not configured");
    return { ok: false, skipped: true };
  }

  let response: Response;
  try {
    response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: truncateForDiscord(content) }),
    });
  } catch (error) {
    console.error("[discord] Send failed", error);
    return { ok: false, error };
  }

  if (!response.ok) {
    const body = await response.text();
    console.error("[discord] Send failed", response.status, body);
    return { ok: false, status: response.status, body };
  }

  return { ok: true, data: await response.json() };
}
