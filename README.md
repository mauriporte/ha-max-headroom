# Max Headroom Card

A Max Headroom-style animated tile for Home Assistant dashboards. It glitches, stutters, cracks jokes and reacts to your house, and you can talk to him through any Home Assistant conversation agent. One JavaScript file, no dependencies.

## What it does

- Plays your own Max clip (or a drawn placeholder without one) with scan lines, glitches and stutter jumps.
- Speaks real lines from your clip, with captions, when you give their timings.
- Lets you type a question: the card asks your conversation agent (Ollama, OpenAI, Gemini, Assist…) and Max answers through your TTS engine. The pitch jumps and stutters are added to the audio. The video freezes while he talks.
- Comments on people arriving and leaving and on doors and windows opening, out of the box.
- Click him to poke him. The mute button remembers its setting per browser.

## Install

**HACS:** add this repository as a custom repository (type *Dashboard*), install *Max Headroom Card*, and reload the browser.

**Manual:** copy `max-headroom-card.js` to `/config/www/`, then add the resource `/local/max-headroom-card.js` (type *JavaScript module*) under Settings → Dashboards → Resources.

The clip is not included. Use your own footage: put it in `/config/www/` and point `video:` at it.

## Example

```yaml
type: custom:max-headroom-card
name: Max Headroom
video: /local/max.mp4
agent_id: conversation.ollama_conversation
tts_engine: tts.piper
tts_language: en_US
tts_voice: en_US-ryan-high
voice_pitch: 4.1
segments:        # stretches of the video to loop (seconds)
  - [0, 12.4]
  - [12.4, 29.8]
lines:           # stretches where he really speaks: played with sound, optional caption
  - [1.6, 8.9, "Good evening, and welcome to the show."]
```

A panel view gives him the whole screen.

## Options

| Option | Default | What it does |
|---|---|---|
| `video` / `image` | drawn placeholder | Your Max footage or picture |
| `segments` | whole video | `[[start, end], …]` seconds to loop, e.g. only the shots of Max |
| `lines` | none | `[[start, end, "caption"?], …]` stretches where he speaks, played with sound |
| `tts_engine` | browser voice | HA TTS entity for generated speech |
| `tts_language`, `tts_voice` | HA's language | e.g. `en_US` / `en_US-ryan-high` |
| `voice_pitch` | 0 | Semitones to raise the TTS voice (4.1 puts Piper's ryan-high on Max's ~240 Hz) |
| `agent_id` | HA default agent | Conversation agent that writes his replies |
| `language` | `en` | Language the agent answers in |
| `persona` | built-in Max prompt | Text sent before every question |
| `messages` | built-in jokes | Idle one-liners |
| `reactions` | people + doors/windows | `[{entity, to?, from?, say: [...]}]`; `[]` turns them off. `{name}` is replaced by the entity's name |
| `name`, `entity`, `voice` | | Display name, an entity to show, browser voice name |

Browsers only allow sound after a click, so the card starts muted. The first tap unlocks audio, tablets included.

## License

MIT. Max Headroom is a trademark of its owners; this project is a fan tribute and ships no footage.
