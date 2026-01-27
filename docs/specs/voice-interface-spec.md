# Unhooked: Voice Interface Specification
## (Originally: Phase 3)

**Version:** 3.0  
**Last Updated:** 2026-01-11  
**Status:** Complete  
**Document Type:** Technical Specification  
**Legacy Reference:** Phase 3

---

## Voice-First Chat Interface

### Overview

Add voice capabilities to the chat interface using OpenAI's Whisper (STT) and TTS with Nova voice. This transforms text-based conversations into therapeutic voice interactions that leverage the production effect for stronger belief change.

**Goal:** Users can have turn-based voice conversations with the AI coach, with visual transcript highlighting and fallback to text when needed.

**Prerequisites:**
- Foundation Setup (Foundation Setup (Phase 1.1), Authentication (Phase 1.2), Chat Infrastructure (Phase 1.3)1) complete â€” Nuxt 3 app deployed
- Authentication (Foundation Setup (Phase 1.1), Authentication (Phase 1.2), Chat Infrastructure (Phase 1.3)2) complete â€” Supabase auth working
- Chat Infrastructure (Foundation Setup (Phase 1.1), Authentication (Phase 1.2), Chat Infrastructure (Phase 1.3)3) complete â€” Chat with Gemini working
- Program Structure (Program Structure (Phase 2)) complete â€” 5-illusion curriculum implemented
- Program Structure (Phase 2) complete Ã¢â‚¬â€ Program structure, illusions, progress tracking

---

## Why Voice?

Research supports voice as the optimal modality for Unhooked's therapeutic approach:

1. **Production Effect**: Speaking aloud improves memory retention. The dual action of speaking and hearing oneself has the most beneficial impact on long-term memory.

2. **Emotional Processing**: Speaking activates emotional processing more than typing Ã¢â‚¬â€ critical for belief change work around addiction.

3. **Persuasion**: Voice is more persuasive than written word for changing beliefs, particularly for controversial or challenging ideas.

4. **Accessibility**: Many people don't read long-form content. Audio delivery removes this barrier while maintaining depth.

5. **CBT Alignment**: Cognitive Behavioral Therapy effectiveness relies on verbalization Ã¢â‚¬â€ articulating thoughts to examine them. Voice enables this naturally.

**Design Principle:** Voice is the therapeutic medium; text is the accessibility fallback.

---

## Architecture

**Pipeline Approach (Turn-based):**
```
User speaks Ã¢â€ â€™ OpenAI Whisper (STT) Ã¢â€ â€™ LLM (Gemini) Ã¢â€ â€™ OpenAI TTS Ã¢â€ â€™ User hears
                     Ã¢â€ â€œ                      Ã¢â€ â€œ              Ã¢â€ â€œ
              Transcript shown      Response text    Word-by-word display
```

**Why Pipeline vs Native Voice Models:**
- Lower cost (~$6/user vs ~$12/user for OpenAI Realtime)
- More control and debuggability during MVP
- Simpler integration with existing Nuxt/Supabase architecture
- Clear upgrade path to native voice models if needed later

**Providers:**
| Component | Provider | Cost |
|-----------|----------|------|
| Speech-to-Text | OpenAI Whisper API | $0.006/min |
| LLM | Gemini (existing) | Per Foundation Setup (Phase 1.1), Authentication (Phase 1.2), Chat Infrastructure (Phase 1.3)3 |
| Text-to-Speech | OpenAI TTS | $0.015/1K chars |
| Voice | Nova | Ã¢â‚¬â€ |

---

## Key Design Decisions

### Voice Selection
**Nova** Ã¢â‚¬â€ warm, friendly, conversational. Fits the "wise friend" persona guiding users through belief change.

### Transcript Display
**Word-by-word with color highlighting** (karaoke-style):
- Words appear one at a time, synced to audio
- Current word highlighted in brand accent color (orange)
- Previous words remain visible but dimmer (white)
- 1-2 lines visible at a time, scrolling as needed

Research shows this approach has the highest retention rates for educational content because it eliminates pacing guesswork and creates a micro-anticipation loop.

### User Input
**Voice-first with text fallback:**
- Large mic button as primary input
- Small "Type instead" link below mic
- Encourages voice for therapeutic benefit while accommodating situational needs

### Session Flow
**Turn-based:**
- AI speaks complete response, user waits
- When AI finishes, mic button activates
- User records response, auto-submits
- Cycle repeats

Interruption support deferred to future phase.

---

## User Experience Flow

### Session Start
1. User navigates to `/session/[illusion]`
2. Brief loading state while initializing audio
3. AI begins speaking first message (opening the illusion exploration)
4. Word-by-word transcript displays as AI speaks

### During AI Response
- Minimal UI: waveform animation + word-by-word transcript
- Pause/resume button available
- User waits for AI to complete

### User's Turn to Respond
1. AI finishes speaking
2. Mic button pulses to indicate "your turn"
3. User taps mic to start recording
4. Pulsing animation + simple waveform shows recording active
5. User taps again to stop
6. Audio auto-submits (no preview/re-record for MVP)
7. User's words transcribed and displayed on screen
8. Brief loading state while AI processes

### Text Fallback
- "Type instead" link always visible below mic
- Tapping reveals text input
- Text responses work identically (sent to LLM, AI responds via voice)

### Session Complete
- AI outputs `[SESSION_COMPLETE]` token (stripped from display)
- Audio finishes playing
- Session complete UI appears (per Program Structure (Phase 2))

---

## UI Components

### VoiceSessionView (replaces text ChatWindow for sessions)

```
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š  Ã¢â€ Â Exit session                         Ã¢â€â€š
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¤
Ã¢â€â€š                                         Ã¢â€â€š
Ã¢â€â€š         [Waveform Animation]            Ã¢â€â€š
Ã¢â€â€š                                         Ã¢â€â€š
Ã¢â€â€š    "The stress you feel before you      Ã¢â€â€š
Ã¢â€â€š     reach for nicotine Ã¢â‚¬â€ that's not     Ã¢â€â€š
Ã¢â€â€š     life stress. That's withdrawal."    Ã¢â€â€š
Ã¢â€â€š              Ã¢â€“Â²                          Ã¢â€â€š
Ã¢â€â€š         [current word highlighted]      Ã¢â€â€š
Ã¢â€â€š                                         Ã¢â€â€š
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¤
Ã¢â€â€š                                         Ã¢â€â€š
Ã¢â€â€š            [ Ã°Å¸Å½Â¤ ]                        Ã¢â€â€š
Ã¢â€â€š         Tap to respond                  Ã¢â€â€š
Ã¢â€â€š                                         Ã¢â€â€š
Ã¢â€â€š         Type instead                    Ã¢â€â€š
Ã¢â€â€š                                         Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
```

### Recording State

```
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š                                         Ã¢â€â€š
Ã¢â€â€š         [Waveform of user voice]        Ã¢â€â€š
Ã¢â€â€š                                         Ã¢â€â€š
Ã¢â€â€š            [ Ã°Å¸Å½Â¤ Recording... ]          Ã¢â€â€š
Ã¢â€â€š         Tap to finish                   Ã¢â€â€š
Ã¢â€â€š                                         Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
```

### Components to Build

| Component | Purpose |
|-----------|---------|
| `VoiceSessionView.vue` | Main voice session container |
| `AudioWaveform.vue` | Visual feedback during AI speech and user recording |
| `WordByWordTranscript.vue` | Synchronized transcript display with highlighting |
| `VoiceMicButton.vue` | Recording control with states (ready/recording/processing) |
| `TextFallbackInput.vue` | Expandable text input for fallback |

---

## API Endpoints

### New Endpoints

#### `POST /api/voice/transcribe`
Converts user audio to text using OpenAI Whisper.

**Request:**
```typescript
{
  audio: Blob  // WebM or WAV audio file
}
```

**Response:**
```typescript
{
  text: string  // Transcribed text
}
```

#### `POST /api/voice/synthesize`
Converts AI response text to speech using OpenAI TTS.

**Request:**
```typescript
{
  text: string       // Text to speak
  voice?: string     // Voice selection (default: 'nova')
}
```

**Response:**
```typescript
{
  audio: ArrayBuffer  // Audio data
  wordTimings?: Array<{
    word: string
    start: number  // milliseconds
    end: number
  }>
}
```

Note: OpenAI TTS doesn't provide word timings natively. Options:
1. Estimate based on character count and audio duration
2. Use a separate alignment service
3. Stream TTS and update transcript based on audio progress

**MVP approach:** Estimate timings based on audio duration / word count, with slight leading offset per research (50-100ms before spoken).

### Modified Endpoints

#### `POST /api/chat` (updated)
Add support for voice context flag.

**Request addition:**
```typescript
{
  // existing fields...
  inputModality?: 'voice' | 'text'  // Track how user responded
}
```

---

## Composables

### `useVoiceSession`
Manages voice session state and audio handling.

```typescript
const useVoiceSession = () => {
  // State
  const isAISpeaking = ref(false)
  const isRecording = ref(false)
  const isProcessing = ref(false)
  const currentTranscript = ref<string>('')
  const currentWordIndex = ref(0)
  const audioElement = ref<HTMLAudioElement | null>(null)
  
  // Methods
  const playAIResponse = async (text: string) => { ... }
  const startRecording = async () => { ... }
  const stopRecording = async () => { ... }
  const transcribeAudio = async (blob: Blob) => { ... }
  
  // Permissions
  const hasMicPermission = ref(false)
  const requestMicPermission = async () => { ... }
  
  return {
    isAISpeaking,
    isRecording,
    isProcessing,
    currentTranscript,
    currentWordIndex,
    playAIResponse,
    startRecording,
    stopRecording,
    hasMicPermission,
    requestMicPermission
  }
}
```

### `useAudioRecorder`
Low-level audio recording utilities.

```typescript
const useAudioRecorder = () => {
  const mediaRecorder = ref<MediaRecorder | null>(null)
  const audioChunks = ref<Blob[]>([])
  
  const start = async () => { ... }
  const stop = async (): Promise<Blob> => { ... }
  const getAudioLevel = (): number => { ... }  // For waveform visualization
  
  return { start, stop, getAudioLevel }
}
```

---

## File Structure

```
unhooked/
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ server/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ api/
Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ chat.post.ts                    # UPDATE: Add inputModality
Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ voice/
Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ transcribe.post.ts          # NEW: Whisper STT
Ã¢â€â€š           Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ synthesize.post.ts          # NEW: OpenAI TTS
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ composables/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ useVoiceSession.ts                  # NEW: Voice session state
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ useAudioRecorder.ts                 # NEW: Recording utilities
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ components/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ voice/
Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ VoiceSessionView.vue            # NEW: Main voice container
Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ AudioWaveform.vue               # NEW: Waveform visualization
Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ WordByWordTranscript.vue        # NEW: Synced transcript
Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ VoiceMicButton.vue              # NEW: Record button
Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ TextFallbackInput.vue           # NEW: Text input fallback
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ pages/
    Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ session/
        Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ [illusion].vue                      # UPDATE: Use VoiceSessionView
```

---

## Environment Variables

Add to `.env`:

```bash
# OpenAI (for Whisper STT and TTS)
OPENAI_API_KEY=your-openai-api-key
```

Note: You may already have this from Foundation Setup (Phase 1.1), Authentication (Phase 1.2), Chat Infrastructure (Phase 1.3)3 setup. Ensure it has access to:
- `whisper-1` model (transcription)
- `tts-1` model (text-to-speech)

---

## Step-by-Step Implementation

### Step 1: Install dependencies

```bash
npm install openai
```

(If not already installed from Foundation Setup (Phase 1.1), Authentication (Phase 1.2), Chat Infrastructure (Phase 1.3)3)

---

### Step 2: Create transcription endpoint

Create `server/api/voice/transcribe.post.ts`:

```typescript
import OpenAI from 'openai'
import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const formData = await readFormData(event)
  const audioFile = formData.get('audio') as File
  
  if (!audioFile) {
    throw createError({ statusCode: 400, message: 'Audio file required' })
  }

  const config = useRuntimeConfig()
  const openai = new OpenAI({ apiKey: config.openaiApiKey })

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'text'
    })

    return { text: transcription }
  } catch (error: any) {
    console.error('Transcription error:', error)
    throw createError({ 
      statusCode: 500, 
      message: 'Failed to transcribe audio' 
    })
  }
})
```

---

### Step 3: Create TTS endpoint

Create `server/api/voice/synthesize.post.ts`:

```typescript
import OpenAI from 'openai'
import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { text, voice = 'nova' } = body

  if (!text) {
    throw createError({ statusCode: 400, message: 'Text required' })
  }

  const config = useRuntimeConfig()
  const openai = new OpenAI({ apiKey: config.openaiApiKey })

  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text,
      response_format: 'mp3'
    })

    const arrayBuffer = await response.arrayBuffer()
    
    // Calculate estimated word timings
    const words = text.split(/\s+/)
    const audioDurationMs = estimateAudioDuration(text)
    const wordTimings = calculateWordTimings(words, audioDurationMs)

    // Return audio as base64 with timings
    const base64Audio = Buffer.from(arrayBuffer).toString('base64')
    
    return {
      audio: base64Audio,
      contentType: 'audio/mpeg',
      wordTimings
    }
  } catch (error: any) {
    console.error('TTS error:', error)
    throw createError({ 
      statusCode: 500, 
      message: 'Failed to synthesize speech' 
    })
  }
})

// Estimate audio duration based on text length
// OpenAI TTS speaks at roughly 150 words per minute
function estimateAudioDuration(text: string): number {
  const words = text.split(/\s+/).length
  const wordsPerMs = 150 / 60000  // 150 WPM converted to words per ms
  return words / wordsPerMs
}

// Calculate approximate start time for each word
function calculateWordTimings(words: string[], totalDurationMs: number) {
  const msPerWord = totalDurationMs / words.length
  const leadTimeMs = 75  // Show word slightly before spoken (research-backed)
  
  return words.map((word, index) => ({
    word,
    start: Math.max(0, (index * msPerWord) - leadTimeMs),
    end: ((index + 1) * msPerWord) - leadTimeMs
  }))
}
```

---

### Step 4: Create audio recorder composable

Create `composables/useAudioRecorder.ts`:

```typescript
export const useAudioRecorder = () => {
  const mediaRecorder = ref<MediaRecorder | null>(null)
  const audioChunks = ref<Blob[]>([])
  const isRecording = ref(false)
  const audioContext = ref<AudioContext | null>(null)
  const analyser = ref<AnalyserNode | null>(null)

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    
    // Set up audio context for visualization
    audioContext.value = new AudioContext()
    analyser.value = audioContext.value.createAnalyser()
    const source = audioContext.value.createMediaStreamSource(stream)
    source.connect(analyser.value)
    analyser.value.fftSize = 256
    
    // Set up recorder
    mediaRecorder.value = new MediaRecorder(stream)
    audioChunks.value = []
    
    mediaRecorder.value.ondataavailable = (event) => {
      audioChunks.value.push(event.data)
    }
    
    mediaRecorder.value.start()
    isRecording.value = true
  }

  const stop = async (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!mediaRecorder.value) {
        throw new Error('No recording in progress')
      }
      
      mediaRecorder.value.onstop = () => {
        const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' })
        isRecording.value = false
        
        // Clean up
        mediaRecorder.value?.stream.getTracks().forEach(track => track.stop())
        audioContext.value?.close()
        
        resolve(audioBlob)
      }
      
      mediaRecorder.value.stop()
    })
  }

  const getAudioLevel = (): number => {
    if (!analyser.value) return 0
    
    const dataArray = new Uint8Array(analyser.value.frequencyBinCount)
    analyser.value.getByteFrequencyData(dataArray)
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length
    return average / 255  // Normalize to 0-1
  }

  return {
    isRecording,
    start,
    stop,
    getAudioLevel
  }
}
```

---

### Step 5: Create voice session composable

Create `composables/useVoiceSession.ts`:

```typescript
export const useVoiceSession = () => {
  const { start: startRecording, stop: stopRecording, getAudioLevel, isRecording } = useAudioRecorder()
  
  const isAISpeaking = ref(false)
  const isProcessing = ref(false)
  const currentTranscript = ref('')
  const currentWordIndex = ref(0)
  const wordTimings = ref<Array<{ word: string; start: number; end: number }>>([])
  const hasMicPermission = ref(false)
  const error = ref<string | null>(null)
  
  let audioElement: HTMLAudioElement | null = null
  let wordTimingInterval: ReturnType<typeof setInterval> | null = null

  const requestMicPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      hasMicPermission.value = true
      return true
    } catch (e) {
      hasMicPermission.value = false
      error.value = 'Microphone permission denied'
      return false
    }
  }

  const playAIResponse = async (text: string): Promise<void> => {
    isAISpeaking.value = true
    currentTranscript.value = text
    currentWordIndex.value = 0
    
    try {
      // Get synthesized audio
      const response = await $fetch('/api/voice/synthesize', {
        method: 'POST',
        body: { text, voice: 'nova' }
      })
      
      wordTimings.value = response.wordTimings
      
      // Create and play audio
      const audioBlob = new Blob(
        [Uint8Array.from(atob(response.audio), c => c.charCodeAt(0))],
        { type: response.contentType }
      )
      const audioUrl = URL.createObjectURL(audioBlob)
      
      audioElement = new Audio(audioUrl)
      
      // Sync word highlighting with audio playback
      audioElement.onplay = () => {
        const startTime = Date.now()
        wordTimingInterval = setInterval(() => {
          const elapsed = Date.now() - startTime
          const currentWord = wordTimings.value.findIndex(
            (timing, index) => 
              elapsed >= timing.start && 
              (index === wordTimings.value.length - 1 || elapsed < wordTimings.value[index + 1].start)
          )
          if (currentWord !== -1) {
            currentWordIndex.value = currentWord
          }
        }, 50)
      }
      
      audioElement.onended = () => {
        if (wordTimingInterval) clearInterval(wordTimingInterval)
        isAISpeaking.value = false
        currentWordIndex.value = wordTimings.value.length - 1
        URL.revokeObjectURL(audioUrl)
      }
      
      audioElement.onerror = () => {
        if (wordTimingInterval) clearInterval(wordTimingInterval)
        isAISpeaking.value = false
        error.value = 'Failed to play audio'
        URL.revokeObjectURL(audioUrl)
      }
      
      await audioElement.play()
    } catch (e: any) {
      isAISpeaking.value = false
      error.value = e.message || 'Failed to synthesize speech'
    }
  }

  const pauseAudio = () => {
    audioElement?.pause()
  }

  const resumeAudio = () => {
    audioElement?.play()
  }

  const recordUserResponse = async (): Promise<string> => {
    isProcessing.value = true
    
    try {
      await startRecording()
    } catch (e: any) {
      isProcessing.value = false
      error.value = 'Failed to start recording'
      throw e
    }
    
    // Recording continues until stopUserRecording is called
    return ''  // Actual transcription happens in stopUserRecording
  }

  const stopUserRecording = async (): Promise<string> => {
    try {
      const audioBlob = await stopRecording()
      
      // Transcribe
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      
      const response = await $fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      })
      
      isProcessing.value = false
      return response.text
    } catch (e: any) {
      isProcessing.value = false
      error.value = e.message || 'Failed to transcribe recording'
      throw e
    }
  }

  const cleanup = () => {
    if (wordTimingInterval) clearInterval(wordTimingInterval)
    if (audioElement) {
      audioElement.pause()
      audioElement = null
    }
  }

  onUnmounted(cleanup)

  return {
    // State
    isAISpeaking,
    isRecording,
    isProcessing,
    currentTranscript,
    currentWordIndex,
    wordTimings,
    hasMicPermission,
    error,
    
    // Methods
    requestMicPermission,
    playAIResponse,
    pauseAudio,
    resumeAudio,
    recordUserResponse,
    stopUserRecording,
    getAudioLevel,
    cleanup
  }
}
```

---

### Step 6: Create WordByWordTranscript component

Create `components/voice/WordByWordTranscript.vue`:

```vue
<template>
  <div class="text-center px-4 py-8">
    <p class="text-xl leading-relaxed">
      <span
        v-for="(word, index) in words"
        :key="index"
        class="transition-colors duration-100"
        :class="getWordClass(index)"
      >
        {{ word }}{{ index < words.length - 1 ? ' ' : '' }}
      </span>
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  transcript: string
  currentWordIndex: number
}>()

const words = computed(() => props.transcript.split(/\s+/))

const getWordClass = (index: number) => {
  if (index < props.currentWordIndex) {
    return 'text-white-65'  // Already spoken
  } else if (index === props.currentWordIndex) {
    return 'text-brand-accent font-semibold'  // Currently speaking
  } else {
    return 'text-white-65 opacity-50'  // Not yet spoken
  }
}
</script>
```

---

### Step 7: Create AudioWaveform component

Create `components/voice/AudioWaveform.vue`:

```vue
<template>
  <div class="flex items-center justify-center gap-1 h-16">
    <div
      v-for="i in barCount"
      :key="i"
      class="w-1 bg-brand-accent rounded-full transition-all duration-75"
      :style="{ height: `${getBarHeight(i)}px` }"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  isActive: boolean
  audioLevel?: number  // 0-1, for user recording
}>()

const barCount = 20
const animationFrame = ref(0)

// Animate bars when active
let interval: ReturnType<typeof setInterval> | null = null

watch(() => props.isActive, (active) => {
  if (active && !props.audioLevel) {
    // AI speaking - gentle wave animation
    interval = setInterval(() => {
      animationFrame.value++
    }, 100)
  } else if (interval) {
    clearInterval(interval)
    interval = null
  }
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})

const getBarHeight = (index: number): number => {
  if (!props.isActive) return 4
  
  if (props.audioLevel !== undefined) {
    // User recording - respond to actual audio level
    const variation = Math.sin(index * 0.5) * 0.3 + 0.7
    return 8 + (props.audioLevel * 40 * variation)
  }
  
  // AI speaking - animated wave
  const wave = Math.sin((animationFrame.value + index) * 0.3)
  return 16 + wave * 12
}
</script>
```

---

### Step 8: Create VoiceMicButton component

Create `components/voice/VoiceMicButton.vue`:

```vue
<template>
  <div class="flex flex-col items-center gap-3">
    <button
      @click="handleClick"
      :disabled="disabled"
      class="w-20 h-20 rounded-full flex items-center justify-center transition-all"
      :class="buttonClass"
    >
      <svg 
        class="w-8 h-8" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          v-if="!isRecording"
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
        />
        <path 
          v-else
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <path
          v-if="isRecording"
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
        />
      </svg>
    </button>
    
    <p class="text-white-65 text-sm">
      {{ statusText }}
    </p>
    
    <button
      v-if="showTextFallback && !isRecording"
      @click="$emit('textFallback')"
      class="text-white-65 hover:text-white text-sm transition underline"
    >
      Type instead
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  isRecording: boolean
  disabled: boolean
  showTextFallback?: boolean
}>()

const emit = defineEmits<{
  start: []
  stop: []
  textFallback: []
}>()

const buttonClass = computed(() => {
  if (props.disabled) {
    return 'bg-brand-glass text-white-65 cursor-not-allowed'
  }
  if (props.isRecording) {
    return 'bg-red-500 text-white animate-pulse'
  }
  return 'bg-brand-accent text-white hover:scale-105'
})

const statusText = computed(() => {
  if (props.disabled) return 'Please wait...'
  if (props.isRecording) return 'Tap to finish'
  return 'Tap to respond'
})

const handleClick = () => {
  if (props.disabled) return
  if (props.isRecording) {
    emit('stop')
  } else {
    emit('start')
  }
}
</script>
```

---

### Step 9: Create VoiceSessionView component

Create `components/voice/VoiceSessionView.vue`:

```vue
<template>
  <div class="flex flex-col h-[calc(100vh-8rem)] glass rounded-card border border-brand-border overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-brand-border">
      <NuxtLink
        to="/dashboard"
        class="text-white-65 hover:text-white text-sm transition inline-flex items-center gap-1"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Exit session
      </NuxtLink>
      
      <button
        v-if="isAISpeaking"
        @click="togglePause"
        class="text-white-65 hover:text-white text-sm transition"
      >
        {{ isPaused ? 'Resume' : 'Pause' }}
      </button>
    </div>

    <!-- Main content area -->
    <div class="flex-1 flex flex-col items-center justify-center p-6">
      <!-- Waveform -->
      <AudioWaveform
        :is-active="isAISpeaking || isRecording"
        :audio-level="isRecording ? audioLevel : undefined"
        class="mb-8"
      />
      
      <!-- Transcript (AI speaking) -->
      <WordByWordTranscript
        v-if="currentTranscript && (isAISpeaking || showingTranscript)"
        :transcript="currentTranscript"
        :current-word-index="currentWordIndex"
        class="max-w-lg mb-8"
      />
      
      <!-- User's transcribed message -->
      <div
        v-if="lastUserMessage"
        class="max-w-lg mb-8 p-4 rounded-2xl bg-brand-accent/20 border border-brand-accent/30"
      >
        <p class="text-white text-center">{{ lastUserMessage }}</p>
      </div>
      
      <!-- Processing indicator -->
      <div v-if="isProcessing" class="text-white-65 text-center mb-8">
        <div class="flex gap-1 justify-center mb-2">
          <span class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
          <span class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
          <span class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
        </div>
        <p class="text-sm">Processing...</p>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="error" class="px-4 py-2 bg-red-500/20 border-t border-red-500/50">
      <p class="text-red-200 text-sm text-center">{{ error }}</p>
      <button @click="error = null" class="text-red-200 text-xs underline mt-1">Dismiss</button>
    </div>

    <!-- Input area -->
    <div class="p-6 border-t border-brand-border">
      <!-- Voice input (default) -->
      <div v-if="!showTextInput">
        <VoiceMicButton
          :is-recording="isRecording"
          :disabled="isAISpeaking || isProcessing"
          :show-text-fallback="true"
          @start="handleStartRecording"
          @stop="handleStopRecording"
          @text-fallback="showTextInput = true"
        />
      </div>
      
      <!-- Text input (fallback) -->
      <div v-else>
        <form @submit.prevent="handleTextSubmit" class="flex gap-3">
          <input
            v-model="textInput"
            type="text"
            placeholder="Type your response..."
            :disabled="isAISpeaking || isProcessing"
            class="glass-input flex-1 px-4 py-3 rounded-pill text-white placeholder-white-65 border border-brand-border focus:border-brand-border-strong focus:outline-none transition"
          />
          <button
            type="submit"
            :disabled="!textInput.trim() || isAISpeaking || isProcessing"
            class="btn-primary px-6 py-3 rounded-pill font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </form>
        <button
          @click="showTextInput = false"
          class="text-white-65 hover:text-white text-sm transition mt-3 block mx-auto"
        >
          Use voice instead
        </button>
      </div>
    </div>
    
    <!-- Mic permission request overlay -->
    <div
      v-if="showPermissionRequest"
      class="absolute inset-0 bg-brand-bg-dark/90 flex items-center justify-center p-6"
    >
      <div class="glass rounded-card p-8 max-w-md text-center border border-brand-border">
        <h3 class="text-xl font-semibold text-white mb-4">Enable Microphone</h3>
        <p class="text-white-65 mb-6">
          Voice sessions work best when you speak your thoughts aloud. 
          This helps the insights stick.
        </p>
        <button
          @click="handleRequestPermission"
          class="btn-primary text-white px-6 py-3 rounded-pill font-semibold mb-3"
        >
          Enable Microphone
        </button>
        <button
          @click="showPermissionRequest = false; showTextInput = true"
          class="text-white-65 hover:text-white text-sm transition block mx-auto"
        >
          Continue with text only
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  mythNumber: number
}>()

const emit = defineEmits<{
  sessionComplete: []
}>()

const {
  isAISpeaking,
  isRecording,
  isProcessing,
  currentTranscript,
  currentWordIndex,
  hasMicPermission,
  error,
  requestMicPermission,
  playAIResponse,
  pauseAudio,
  resumeAudio,
  recordUserResponse,
  stopUserRecording,
  getAudioLevel
} = useVoiceSession()

const { messages, sendMessage, conversationId } = useChat()
const { completeSession, fetchProgress } = useProgress()

const showTextInput = ref(false)
const textInput = ref('')
const lastUserMessage = ref('')
const showingTranscript = ref(false)
const isPaused = ref(false)
const showPermissionRequest = ref(false)
const audioLevel = ref(0)

// Update audio level during recording
let audioLevelInterval: ReturnType<typeof setInterval> | null = null

watch(isRecording, (recording) => {
  if (recording) {
    audioLevelInterval = setInterval(() => {
      audioLevel.value = getAudioLevel()
    }, 50)
  } else if (audioLevelInterval) {
    clearInterval(audioLevelInterval)
    audioLevelInterval = null
  }
})

// Check mic permission on mount
onMounted(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(track => track.stop())
    hasMicPermission.value = true
  } catch {
    showPermissionRequest.value = true
  }
  
  // Start the session with AI's opening
  await startSession()
})

const startSession = async () => {
  // Send initial empty message to get AI's opening
  const response = await sendMessage('', props.mythNumber, 'voice')
  if (response?.content) {
    await playAIResponse(response.content)
    showingTranscript.value = true
    
    // Check for session complete
    if (response.content.includes('[SESSION_COMPLETE]')) {
      handleSessionComplete()
    }
  }
}

const handleRequestPermission = async () => {
  const granted = await requestMicPermission()
  showPermissionRequest.value = !granted
}

const handleStartRecording = async () => {
  if (!hasMicPermission.value) {
    showPermissionRequest.value = true
    return
  }
  
  lastUserMessage.value = ''
  await recordUserResponse()
}

const handleStopRecording = async () => {
  try {
    const transcript = await stopUserRecording()
    lastUserMessage.value = transcript
    await processUserMessage(transcript, 'voice')
  } catch (e) {
    // Error already handled in composable
  }
}

const handleTextSubmit = async () => {
  if (!textInput.value.trim()) return
  
  lastUserMessage.value = textInput.value
  const message = textInput.value
  textInput.value = ''
  
  await processUserMessage(message, 'text')
}

const processUserMessage = async (message: string, modality: 'voice' | 'text') => {
  const response = await sendMessage(message, props.mythNumber, modality)
  
  if (response?.content) {
    // Strip session complete token for display
    const displayContent = response.content.replace('[SESSION_COMPLETE]', '').trim()
    await playAIResponse(displayContent)
    showingTranscript.value = true
    
    // Check for session complete
    if (response.content.includes('[SESSION_COMPLETE]')) {
      handleSessionComplete()
    }
  }
}

const handleSessionComplete = async () => {
  await completeSession(conversationId.value!, props.mythNumber)
  await fetchProgress()
  emit('sessionComplete')
}

const togglePause = () => {
  if (isPaused.value) {
    resumeAudio()
  } else {
    pauseAudio()
  }
  isPaused.value = !isPaused.value
}

onUnmounted(() => {
  if (audioLevelInterval) clearInterval(audioLevelInterval)
})
</script>
```

---

### Step 10: Update session page to use voice

Update `pages/session/[illusion].vue`:

```vue
<template>
  <div class="max-w-3xl mx-auto">
    <!-- Session complete UI -->
    <SessionCompleteCard
      v-if="sessionComplete"
      :next-illusion="nextMyth"
      @continue="handleContinue"
      @dashboard="navigateTo('/dashboard')"
      @finish="navigateTo('/ceremony')"
    />

    <!-- Voice session interface -->
    <VoiceSessionView
      v-else
      :illusion-number="mythNumber"
      @session-complete="sessionComplete = true"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const mythNumber = computed(() => parseInt(route.params.illusion as string))

const { progress, fetchProgress } = useProgress()

const sessionComplete = ref(false)

const nextMyth = computed(() => {
  if (!progress.value) return null
  const currentIndex = progress.value.myth_order.indexOf(mythNumber.value)
  const next = progress.value.myth_order[currentIndex + 1]
  return next && !progress.value.myths_completed.includes(next) ? next : null
})

onMounted(async () => {
  await fetchProgress()
})

const handleContinue = (nextMythNumber: number) => {
  navigateTo(`/session/${nextMythNumber}`)
}
</script>
```

---

### Step 11: Update useChat to support modality

Update `composables/useChat.ts` to accept input modality:

```typescript
// Add to sendMessage function signature:
const sendMessage = async (
  content: string, 
  mythNumber?: number,
  inputModality?: 'voice' | 'text',
  stream = true
) => {
  // ... existing code ...
  
  // Include modality in request body
  body: JSON.stringify({
    messages: messages.value,
    conversationId: conversationId.value,
    mythNumber,
    inputModality,
    stream: true
  })
  
  // ... rest of existing code ...
}
```

---

### Step 12: Update nuxt.config.ts

Ensure OpenAI API key is available:

```typescript
runtimeConfig: {
  // Server-side only
  geminiApiKey: process.env.GEMINI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,  // Add if not present
  // ...
}
```

---

### Step 13: Test locally

```bash
npm run dev
```

Test the full voice flow:
1. Log in and complete onboarding (if not done)
2. Start a session from dashboard
3. Grant microphone permission when prompted
4. Listen to AI's opening message with word-by-word transcript
5. Tap mic to record your response
6. Verify your speech is transcribed and displayed
7. Listen to AI's response
8. Continue through conversation
9. Test text fallback by clicking "Type instead"
10. Verify session complete triggers properly

---

### Step 14: Commit and deploy

```bash
git add .
git commit -m "Add Phase 3: Voice chat interface with STT/TTS pipeline"
git push origin main
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Mic permission denied | Show explanation, offer text fallback |
| STT fails/empty result | "I didn't catch that. Try again?" + re-record or type option |
| TTS fails | Show transcript anyway, continue via text |
| Network interruption (AI response) | Show partial transcript, offer retry |
| Network interruption (user recording) | Prompt to retry recording |
| User leaves mid-session | Messages persist, can resume later |

---

## Acceptance Criteria

- [ ] AI responses play as audio with Nova voice
- [ ] Word-by-word transcript displays synchronized with audio
- [ ] Current word highlighted in brand accent color
- [ ] Pause/resume works during AI speech
- [ ] Mic button activates after AI finishes speaking
- [ ] Tap-to-start/tap-to-stop recording works
- [ ] Visual feedback (waveform) shows during recording
- [ ] User's speech transcribed and displayed
- [ ] Auto-submit after recording stops
- [ ] Text fallback input available and functional
- [ ] "Type instead" / "Use voice instead" toggles work
- [ ] Session complete detection works
- [ ] Mic permission request handled gracefully
- [ ] Error states display with recovery options
- [ ] Transcript persists to database (text only, no audio)
- [ ] Works on mobile browsers (iOS Safari, Chrome)

---

## Cost Estimates

Per user completing full 5-illusion program (estimated ~30 min total AI speech, ~10 min user speech):

| Component | Usage | Cost |
|-----------|-------|------|
| Whisper STT | ~10 min | $0.06 |
| OpenAI TTS | ~45K chars | $0.68 |
| Gemini LLM | Per Foundation Setup (Phase 1.1), Authentication (Phase 1.2), Chat Infrastructure (Phase 1.3)3 | ~$0.50 |
| **Total** | | **~$1.25/user** |

Well within the $199 price point (~0.6% of revenue).

---

## What's Deferred

- **Interruption support** Ã¢â‚¬â€ User can't cut in while AI is speaking
- **Audio playback of past sessions** Ã¢â‚¬â€ Only transcript available
- **Voice selection by user** Ã¢â‚¬â€ Hardcoded to Nova
- **Speed control** Ã¢â‚¬â€ No 1.5x/2x playback
- **Native voice models** Ã¢â‚¬â€ Can upgrade later if latency is an issue
- **Offline support** Ã¢â‚¬â€ Requires network connection

---

## Future Enhancements

**Phase 3.5 or 4 possibilities:**
- Add interruption support (upgrade to OpenAI Realtime)
- Let users choose voice (different personas)
- Add speed control for AI speech
- Save audio recordings for user playback
- Background audio mode (listen while doing other things)
- Voice-based progress summaries

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | [Original] | Initial Phase 3 voice specification created |
| 2.0 | 2026-01-11 | Changed terminology from "myths" to "illusions" where applicable; Added version control header |
| 3.0 | 2026-01-11 | Renamed from "Phase 3" to "Voice Interface Specification" for feature-based organization; Added legacy reference for git commit traceability; Updated status to Complete; Updated cross-references to use hybrid naming |
