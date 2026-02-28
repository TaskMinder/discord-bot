export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("OK");
    }

    // ===== Verify GitHub Signature =====
    const signature = request.headers.get("X-Hub-Signature-256");
    const body = await request.text();

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.GITHUB_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const hash = "sha256=" + [...new Uint8Array(digest)]
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (hash !== signature) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = request.headers.get("X-GitHub-Event");
    if (event !== "release") {
      return new Response("Ignored");
    }

    const payload = JSON.parse(body);

    // Only handle the "published" action to avoid duplicate notifications
    if (payload.action !== "published") {
      return new Response("Ignored");
    }

    const release = payload.release;

    // ===== Remove "What's Changed" section =====
    let description = release.body || "Keine Release-Notizen vorhanden.";
    description = description.split("## What's Changed")[0];

    // ===== Convert Markdown to cleaner Discord formatting =====
    description = description
      .replace(/^### (.*$)/gim, "\n**$1**")
      .replace(/^\* (.*$)/gim, "• $1")
      .replace(/^## (.*$)/gim, "") // remove top headers
      .trim();

    description = description.trim();
    if (!description) {
      description = "Keine Release-Notizen vorhanden.";
    }

    // ===== Truncate safely =====
    const MAX_LENGTH = 3500;
    if (description.length > MAX_LENGTH) {
      description =
        description.substring(0, MAX_LENGTH) +
        "\n\n… *(gekürzt — vollständiges Changelog auf GitHub)*";
    }

    // ===== Format Date (German) =====
    const date = new Date(release.published_at).toLocaleDateString("de-DE");

    const discordPayload = {
      content: `<@&${env.DISCORD_ROLE_ID}> 🚀 **Neue Version veröffentlicht!**`,
      embeds: [
        {
          title: release.name || release.tag_name,
          url: release.html_url,
          description: description,
          color: 3913162,
          footer: {
            text: `Veröffentlicht am ${date}`
          }
        }
      ],
      allowed_mentions: {
        roles: [env.DISCORD_ROLE_ID]
      }
    };

    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload)
    });

    return new Response("Success");
  }
};
