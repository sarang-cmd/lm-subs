# r/NotebookLM announcement post

Written in the same voice as the comment you already posted there: casual,
honest about the rough edges, no marketing voice. Everything below is plain
Reddit markdown, so you can paste it straight into the text box.

## Title (pick one)

1. `I built LM Subs: real subtitles for NotebookLM Video Overviews and Audio Overviews (free, open source)`
2. `NotebookLM still has no captions, so I made an extension that adds them`
3. `Captions, speaker labels, and transcript export for Video Overviews and podcasts. Free and open source.`

Option 1 tests best because it names the product, the two formats, and the price.

## Body

```markdown
Hey everyone,

A while back someone asked on here whether NotebookLM can show captions. Short answer: it can't. Video Overviews and Audio Overviews ship with a transcript panel for your *sources*, but there is no CC button and no timed text track on the narration itself. If you need captions for the video Google generates, there is nothing to turn on.

So I built one. It's called LM Subs: https://lm-subs.vercel.app/

**What it actually does**

- Synchronized captions with live word by word highlighting, rendered inside the video frame
- Shows which host is speaking on the two-host Audio Overview podcasts
- CC and caption controls sit in NotebookLM's own bottom play bar, so it looks like it shipped with the product
- Export to .SRT, .VTT, .TXT, .MD, .CSV or .JSON, or copy a cue straight to the clipboard
- Picture in Picture keeps the subtitles on screen
- Searchable transcript drawer with click to seek, chapters, bookmarks, and per-cue editing
- A statistics dashboard for how much of your library you have captioned

**How it stays free**

You bring your own speech-to-text key. Groq and Mistral both have free tiers that need no card, and the extension walks you through creating the key step by step, including making the account. Twelve providers are supported with automatic failover if one hits a rate limit.

Your video never gets uploaded anywhere. LM Subs pulls the compact audio track out of the stream (about 3.4 MB for a 10 minute Video Overview instead of the full 52 MB MP4) and sends only that to whichever provider you picked.

**The catch, and I want to be upfront about it**

It is not on the Chrome Web Store yet. You download a zip, unzip it, and load it as an unpacked extension. It takes about two minutes, and a page opens automatically that walks you through it, including pinning the icon. That friction is genuinely annoying and I am sorry about it. I would rather ship something that works today than sit on it for a month of review.

**It is MIT licensed**

The whole thing runs client side apart from an optional encrypted sync that you can leave switched off. If you want to add features, the repo is open and I would be happy for the help. There is a lot left to build.

If it breaks on one of your notebooks, tell me what the diagnostics panel says and I will fix it.
```

## Images to attach

Use a **text post with an image**, or a **gallery**. Reddit renders the first
image as the thumbnail in the feed, so lead with the player shot.

| Order | File | Why |
| --- | --- | --- |
| 1 | `docs/assets/screenshots/01-player-subtitles.png` | The money shot. Captions with live highlighting inside the video frame, controls docked in the play bar. |
| 2 | `docs/assets/screenshots/09-welcome-install-page.png` | The page Chrome opens the moment you install it. Pre-empts every "how do I set this up" comment. |
| 3 | `docs/assets/screenshots/08-docked-fine-controls.png` | Shows the fine grained controls (speed, loop, PiP, snapshot, boost, skip silence) docked in the native bar. |
| 4 | `docs/assets/screenshots/02-statistics-dashboard.png` | Optional. The statistics dashboard, if you want to show it is more than captions. |

If you paste the `https://lm-subs.vercel.app/` link as a link post instead, the
preview card now resolves to `docs/assets/banner-social-1280x640.png` (1280 by
640, product shot on the right).

## Short reply you can reuse

For when someone asks in the comments whether it handles the podcast format:

```markdown
Yep, Audio Overviews work too. It labels the hosts, so you can tell which one is talking on the two-host deep dives. It transcribes the podcast the same way as a Video Overview, just from the audio stream.
```

And for the "is this safe / where does my data go" question:

```markdown
Fair question. The extension pulls the audio track out of the Google stream in your browser and sends only that audio to whichever speech-to-text provider you configured with your own key. Nothing goes through a server of mine. Cloud sync is opt-in, and the API keys are encrypted before they leave the browser if you turn it on.
```

## Before you post

- Check the subreddit flair rule. r/NotebookLM usually wants a flair, and "Show and Tell" or "Resource" fits.
- Post it yourself from an account with some history. Brand new accounts get auto-removed in most subs.
- Do not post the same text to more than one subreddit on the same day. That trips the spam filter.
- Answer every comment in the first two hours. Reddit ranks early engagement hard.
