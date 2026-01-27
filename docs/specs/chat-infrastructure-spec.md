# Unhooked: Chat Infrastructure Specification
## (Originally: Phase 1.3)

**Version:** 3.0  
**Last Updated:** 2026-01-11  
**Status:** Complete  
**Document Type:** Technical Specification  
**Legacy Reference:** Phase 1.3

---

## Model Router & Conversation System

### Overview

Build the LLM integration layer with a model router abstraction, conversational chat API, and persistence. This enables the core therapeutic conversations that power Unhooked.

**Goal:** Users can have text-based conversations with an AI coach powered by Gemini, with full conversation history saved to Supabase.

**Prerequisites:** Authentication (Phase 1.2) complete â€” Users can sign up, log in, and access protected routes.
- Authentication (Phase 1.2) complete Ã¢â‚¬â€ Supabase auth working

---

## What We're Building

1. **Model router abstraction** Ã¢â‚¬â€ Unified interface for LLM calls
2. **Gemini provider** Ã¢â‚¬â€ First implementation of the router
3. **Chat API endpoint** Ã¢â‚¬â€ Server route that handles messages
4. **Conversation persistence** Ã¢â‚¬â€ Store chats in Supabase
5. **Chat UI** Ã¢â‚¬â€ Simple interface to send/receive messages
6. **Streaming support** Ã¢â‚¬â€ Real-time token streaming for better UX
7. **GDPR compliance** Ã¢â‚¬â€ Documentation for user data export

---

## Architecture

```
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š                        Chat Flow                             Ã¢â€â€š
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¤
Ã¢â€â€š                                                              Ã¢â€â€š
Ã¢â€â€š   User types message                                         Ã¢â€â€š
Ã¢â€â€š         Ã¢â€â€š                                                    Ã¢â€â€š
Ã¢â€â€š         Ã¢â€“Â¼                                                    Ã¢â€â€š
Ã¢â€â€š   Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â    POST /api/chat    Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â  Ã¢â€â€š
Ã¢â€â€š   Ã¢â€â€š   Chat UI   Ã¢â€â€š Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€“Â¶  Ã¢â€â€š   Chat API      Ã¢â€â€š  Ã¢â€â€š
Ã¢â€â€š   Ã¢â€â€š  (Vue)      Ã¢â€â€š                      Ã¢â€â€š   Endpoint      Ã¢â€â€š  Ã¢â€â€š
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ                      Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ  Ã¢â€â€š
Ã¢â€â€š         Ã¢â€“Â²                                       Ã¢â€â€š           Ã¢â€â€š
Ã¢â€â€š         Ã¢â€â€š                                       Ã¢â€“Â¼           Ã¢â€â€š
Ã¢â€â€š         Ã¢â€â€š                              Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â  Ã¢â€â€š
Ã¢â€â€š         Ã¢â€â€š                              Ã¢â€â€š  Model Router   Ã¢â€â€š  Ã¢â€â€š
Ã¢â€â€š         Ã¢â€â€š                              Ã¢â€â€š  (abstraction)  Ã¢â€â€š  Ã¢â€â€š
Ã¢â€â€š         Ã¢â€â€š                              Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ  Ã¢â€â€š
Ã¢â€â€š         Ã¢â€â€š                                       Ã¢â€â€š           Ã¢â€â€š
Ã¢â€â€š         Ã¢â€â€š streaming                             Ã¢â€“Â¼           Ã¢â€â€š
Ã¢â€â€š         Ã¢â€â€š response                     Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â  Ã¢â€â€š
Ã¢â€â€š         Ã¢â€â€š                              Ã¢â€â€š Gemini Provider Ã¢â€â€š  Ã¢â€â€š
Ã¢â€â€š         Ã¢â€â€š                              Ã¢â€â€š (or Claude/GPT) Ã¢â€â€š  Ã¢â€â€š
Ã¢â€â€š         Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â´Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ  Ã¢â€â€š
Ã¢â€â€š                                                              Ã¢â€â€š
Ã¢â€â€š   Conversations saved to Supabase                           Ã¢â€â€š
Ã¢â€â€š                                                              Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
```

---

## Key Design Decisions

Based on architectural review, the following decisions have been made:

1. **Streaming**: Server-Sent Events (SSE) without fallback to non-streaming
2. **Conversation titles**: Simple truncation (first 50 chars of first message)
3. **Conversation UX**: Auto-create conversations on first message
4. **Data retention**: No deletion UI in Phase 1.3, but DELETE policy kept for future admin use
5. **Model selection**: Hardcoded to Gemini Flash for now
6. **System messages**: Provider-specific handling (schema supports 'system' role for Phase 2)
7. **Usage tracking**: Token metadata captured but not exposed to users
8. **Error handling**: Simple generic errors, improved streaming error messages
9. **State persistence**: Accept state loss on refresh (no localStorage)
10. **Message consistency**: Failed messages are orphaned user messages without assistant replies
11. **Message ordering**: Trust `created_at` timestamps
12. **Message mutability**: Messages are immutable (no editing, no deletion for users)
13. **Chat layout**: Full viewport height minus header, responsive design
14. **Input method**: Textarea with Enter to send
15. **Input validation**: Trust Vue's HTML escaping, no special validation
16. **Auth refresh**: Assume Phase 1.2 handles token refresh
17. **Message pagination**: Load all messages (optimized for <100 messages per conversation)
18. **Data privacy**: Supabase RLS sufficient, plus GDPR data export documentation
19. **Provider reliability**: Single provider, surface failures to user
20. **Multi-model future**: Model set per conversation at creation time
21. **Conversation metadata**: Basic fields only (id, title, model, timestamps)
22. **Testing**: Use real providers (no mock)
23. **Scroll behavior**: Always auto-scroll to bottom
24. **Stream persistence**: Save complete response only (no chunked persistence)
25. **Message format**: OpenAI format as standard for provider abstraction
26. **State sync**: DB is source of truth, reload from DB on failure
27. **Input clearing**: Optimistic UI (clear immediately on submit)
28. **Initial loading**: No loading state (trust fast response)
29. **Navigation**: Standalone dashboard (no global header integration)
30. **API testing**: Test all conversation endpoints in acceptance criteria

---

## Supabase Setup (Manual Steps)

Run this SQL in your Supabase SQL Editor to create the conversations tables:

```sql
-- Conversations table
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  model TEXT DEFAULT 'gemini',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies for conversations
CREATE POLICY "Users can read own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for messages (via conversation ownership)
CREATE POLICY "Users can read messages from own conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- DELETE policy kept for future admin use (not exposed in UI)
CREATE POLICY "Users can delete messages from own conversations"
  ON public.messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Index for faster queries
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);

-- Function to update conversation timestamp when new message added
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();
```

---

## Dependencies

```bash
npm install @google/generative-ai
```

---

## Environment Variables

Update `.env` to add your Gemini API key:

```bash
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# LLM Providers
GEMINI_API_KEY=your-gemini-api-key-here
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# App
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

**To get a Gemini API key:**
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API key"
3. Copy the key to your `.env`

**Remember:** Add `GEMINI_API_KEY` to Vercel environment variables too.

---

## File Structure (New & Modified Files)

```
unhooked/
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ server/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ api/
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ chat.post.ts              # NEW: Chat endpoint
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ conversations/
Ã¢â€â€š   Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ index.get.ts          # NEW: List conversations
Ã¢â€â€š   Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ index.post.ts         # NEW: Create conversation
Ã¢â€â€š   Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ [id].get.ts           # NEW: Get conversation with messages
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ utils/
Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ llm/
Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ index.ts              # NEW: Router export
Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ types.ts              # NEW: Shared types
Ã¢â€â€š           Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ router.ts             # NEW: Model router logic
Ã¢â€â€š           Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ providers/
Ã¢â€â€š               Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ gemini.ts         # NEW: Gemini implementation
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ composables/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ useAuth.ts
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ useChat.ts                    # NEW: Chat state management
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ components/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ AppHeader.vue
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ ChatMessage.vue               # NEW: Single message display
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ ChatInput.vue                 # NEW: Message input (textarea)
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ ChatWindow.vue                # NEW: Chat container (full viewport)
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ pages/
    Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ index.vue
    Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ login.vue
    Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ dashboard.vue                 # UPDATE: Add chat interface
```

---

## Step-by-Step Implementation

### Step 1: Install Gemini SDK

```bash
npm install @google/generative-ai
```

---

### Step 2: Create LLM types

Create `server/utils/llm/types.ts`:

```typescript
export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatRequest {
  messages: Message[]
  model?: string
  stream?: boolean
}

export interface ChatResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onComplete: (fullResponse: string) => void
  onError: (error: Error) => void
}

export interface LLMProvider {
  name: string
  chat(request: ChatRequest): Promise<ChatResponse>
  chatStream(request: ChatRequest, callbacks: StreamCallbacks): Promise<void>
}

export type ModelType = 'gemini' | 'claude' | 'openai'

export const DEFAULT_MODEL: ModelType = 'gemini'
```

---

### Step 3: Create Gemini provider

Create `server/utils/llm/providers/gemini.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { LLMProvider, ChatRequest, ChatResponse, StreamCallbacks, Message } from '../types'

export class GeminiProvider implements LLMProvider {
  name = 'gemini'
  private client: GoogleGenerativeAI
  private modelName = 'gemini-1.5-flash'

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey)
  }

  private formatMessages(messages: Message[]) {
    // Gemini uses a different format - convert from OpenAI-style
    // Filter out system messages and handle them separately
    const systemMessage = messages.find(m => m.role === 'system')
    const chatMessages = messages.filter(m => m.role !== 'system')

    const history = chatMessages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }))

    const lastMessage = chatMessages[chatMessages.length - 1]

    return {
      systemInstruction: systemMessage?.content,
      history,
      lastMessage: lastMessage?.content || ''
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { systemInstruction, history, lastMessage } = this.formatMessages(request.messages)

    const model = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction
    })

    const chat = model.startChat({ history })
    const result = await chat.sendMessage(lastMessage)
    const response = result.response

    return {
      content: response.text(),
      model: this.modelName,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      }
    }
  }

  async chatStream(request: ChatRequest, callbacks: StreamCallbacks): Promise<void> {
    const { systemInstruction, history, lastMessage } = this.formatMessages(request.messages)

    const model = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction
    })

    const chat = model.startChat({ history })

    try {
      const result = await chat.sendMessageStream(lastMessage)
      let fullResponse = ''

      for await (const chunk of result.stream) {
        const text = chunk.text()
        fullResponse += text
        callbacks.onToken(text)
      }

      callbacks.onComplete(fullResponse)
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)))
    }
  }
}
```

---

### Step 4: Create model router

Create `server/utils/llm/router.ts`:

```typescript
import type { LLMProvider, ModelType, ChatRequest, ChatResponse, StreamCallbacks } from './types'
import { GeminiProvider } from './providers/gemini'

export class ModelRouter {
  private providers: Map<ModelType, LLMProvider> = new Map()

  constructor(config: { geminiApiKey?: string; anthropicApiKey?: string; openaiApiKey?: string }) {
    // Initialize available providers
    if (config.geminiApiKey) {
      this.providers.set('gemini', new GeminiProvider(config.geminiApiKey))
    }

    // Claude and OpenAI providers will be added in future phases
    // if (config.anthropicApiKey) {
    //   this.providers.set('claude', new ClaudeProvider(config.anthropicApiKey))
    // }
    // if (config.openaiApiKey) {
    //   this.providers.set('openai', new OpenAIProvider(config.openaiApiKey))
    // }
  }

  getProvider(model: ModelType): LLMProvider {
    const provider = this.providers.get(model)
    if (!provider) {
      throw new Error(`Provider not configured for model: ${model}. Check your API keys.`)
    }
    return provider
  }

  listAvailableModels(): ModelType[] {
    return Array.from(this.providers.keys())
  }

  async chat(request: ChatRequest & { model: ModelType }): Promise<ChatResponse> {
    const provider = this.getProvider(request.model)
    return provider.chat(request)
  }

  async chatStream(
    request: ChatRequest & { model: ModelType },
    callbacks: StreamCallbacks
  ): Promise<void> {
    const provider = this.getProvider(request.model)
    return provider.chatStream(request, callbacks)
  }
}
```

---

### Step 5: Create router index export

Create `server/utils/llm/index.ts`:

```typescript
import { ModelRouter } from './router'

let router: ModelRouter | null = null

export function getModelRouter(): ModelRouter {
  if (!router) {
    const config = useRuntimeConfig()
    router = new ModelRouter({
      geminiApiKey: config.geminiApiKey,
      anthropicApiKey: config.anthropicApiKey,
      openaiApiKey: config.openaiApiKey
    })
  }
  return router
}

export * from './types'
export { ModelRouter }
```

---

### Step 6: Create chat API endpoint

Create `server/api/chat.post.ts`:

**Note:** This implementation includes improved error streaming to send error details to the client before closing the stream.

```typescript
import { getModelRouter, DEFAULT_MODEL } from '../utils/llm'
import type { Message, ModelType } from '../utils/llm'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Verify authentication
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const {
    messages,
    conversationId,
    model = DEFAULT_MODEL,
    stream = false
  } = body as {
    messages: Message[]
    conversationId?: string
    model?: ModelType
    stream?: boolean
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw createError({ statusCode: 400, message: 'Messages array is required' })
  }

  const router = getModelRouter()
  const supabase = await serverSupabaseClient(event)

  // Get or create conversation
  let convId = conversationId
  if (!convId) {
    // Create new conversation
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        model,
        title: messages[0]?.content.slice(0, 50) || 'New conversation'
      })
      .select('id')
      .single()

    if (convError) throw createError({ statusCode: 500, message: convError.message })
    convId = newConv.id
  }

  // Save user message
  const lastUserMessage = messages[messages.length - 1]
  if (lastUserMessage.role === 'user') {
    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'user',
      content: lastUserMessage.content
    })
  }

  if (stream) {
    // Streaming response with improved error handling
    setResponseHeader(event, 'Content-Type', 'text/event-stream')
    setResponseHeader(event, 'Cache-Control', 'no-cache')
    setResponseHeader(event, 'Connection', 'keep-alive')

    const encoder = new TextEncoder()
    const streamResponse = new ReadableStream({
      async start(controller) {
        let fullResponse = ''

        await router.chatStream(
          { messages, model },
          {
            onToken: (token) => {
              fullResponse += token
              const data = JSON.stringify({ token, conversationId: convId })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            },
            onComplete: async (response) => {
              // Save assistant message
              await supabase.from('messages').insert({
                conversation_id: convId,
                role: 'assistant',
                content: response
              })

              const data = JSON.stringify({ done: true, conversationId: convId })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              controller.close()
            },
            onError: (error) => {
              // Improved: Stream error details to client
              const data = JSON.stringify({
                error: error.message,
                conversationId: convId
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              controller.close()
            }
          }
        )
      }
    })

    return sendStream(event, streamResponse)
  } else {
    // Non-streaming response
    try {
      const response = await router.chat({ messages, model })

      // Save assistant message
      await supabase.from('messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: response.content
      })

      return {
        ...response,
        conversationId: convId
      }
    } catch (error: any) {
      throw createError({ statusCode: 500, message: error.message })
    }
  }
})
```

---

### Step 7: Create conversations API endpoints

Create `server/api/conversations/index.get.ts`:

```typescript
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, model, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
```

Create `server/api/conversations/index.post.ts`:

```typescript
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { DEFAULT_MODEL } from '../../utils/llm'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { title, model = DEFAULT_MODEL } = body

  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      title: title || 'New conversation',
      model
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
```

Create `server/api/conversations/[id].get.ts`:

```typescript
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')

  const supabase = await serverSupabaseClient(event)

  // Get conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (convError) {
    throw createError({ statusCode: 404, message: 'Conversation not found' })
  }

  // Get messages
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (msgError) {
    throw createError({ statusCode: 500, message: msgError.message })
  }

  return {
    ...conversation,
    messages
  }
})
```

---

### Step 8: Create chat composable

Create `composables/useChat.ts`:

**Note:** On failure, we keep DB state separate from UI state. The database is the source of truth.

```typescript
import type { Message } from '~/server/utils/llm/types'

interface Conversation {
  id: string
  title: string
  model: string
  messages: Message[]
}

export const useChat = () => {
  const messages = ref<Message[]>([])
  const conversationId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sendMessage = async (content: string, stream = true) => {
    if (!content.trim()) return

    // Add user message to local state immediately
    const userMessage: Message = { role: 'user', content }
    messages.value.push(userMessage)

    isLoading.value = true
    error.value = null

    try {
      if (stream) {
        // Streaming request
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.value,
            conversationId: conversationId.value,
            stream: true
          })
        })

        if (!response.ok) {
          throw new Error('Failed to send message')
        }

        // Add empty assistant message that we'll fill in
        const assistantMessage: Message = { role: 'assistant', content: '' }
        messages.value.push(assistantMessage)
        const assistantIndex = messages.value.length - 1

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6))

                if (data.token) {
                  messages.value[assistantIndex].content += data.token
                }

                if (data.conversationId && !conversationId.value) {
                  conversationId.value = data.conversationId
                }

                if (data.error) {
                  error.value = data.error
                }
              }
            }
          }
        }
      } else {
        // Non-streaming request
        const response = await $fetch('/api/chat', {
          method: 'POST',
          body: {
            messages: messages.value,
            conversationId: conversationId.value,
            stream: false
          }
        })

        messages.value.push({ role: 'assistant', content: response.content })

        if (response.conversationId) {
          conversationId.value = response.conversationId
        }
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to send message'
      // On failure: DB is source of truth, reload from DB if needed
      // For now, we'll just remove the optimistically added user message from UI
      messages.value.pop()
    } finally {
      isLoading.value = false
    }
  }

  const loadConversation = async (id: string) => {
    isLoading.value = true
    error.value = null

    try {
      const conversation = await $fetch(`/api/conversations/${id}`)
      conversationId.value = conversation.id
      messages.value = conversation.messages
    } catch (e: any) {
      error.value = e.message || 'Failed to load conversation'
    } finally {
      isLoading.value = false
    }
  }

  const startNewConversation = () => {
    conversationId.value = null
    messages.value = []
    error.value = null
  }

  return {
    messages,
    conversationId,
    isLoading,
    error,
    sendMessage,
    loadConversation,
    startNewConversation
  }
}
```

---

### Step 9: Create chat message component

Create `components/ChatMessage.vue`:

```vue
<template>
  <div
    class="flex gap-4 p-4"
    :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <div
      class="max-w-[80%] rounded-2xl px-4 py-3"
      :class="
        message.role === 'user'
          ? 'bg-brand-accent text-white rounded-br-sm'
          : 'glass border border-brand-border text-white rounded-bl-sm'
      "
    >
      <p class="whitespace-pre-wrap">{{ message.content }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from '~/server/utils/llm/types'

defineProps<{
  message: Message
}>()
</script>
```

---

### Step 10: Create chat input component

Create `components/ChatInput.vue`:

**Note:** Changed from single-line input to textarea with Enter to send. Input clears immediately (optimistic UI).

```vue
<template>
  <form @submit.prevent="handleSubmit" class="flex gap-3">
    <textarea
      v-model="input"
      placeholder="Type your message..."
      :disabled="disabled"
      rows="1"
      @keydown.enter.exact.prevent="handleSubmit"
      class="glass-input flex-1 px-4 py-3 rounded-pill text-white placeholder-white-65 border border-brand-border focus:border-brand-border-strong focus:outline-none transition disabled:opacity-50 resize-none overflow-hidden"
      @input="autoResize"
      ref="textareaRef"
    />
    <button
      type="submit"
      :disabled="disabled || !input.trim()"
      class="btn-primary px-6 py-3 rounded-pill font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span v-if="disabled">...</span>
      <span v-else>Send</span>
    </button>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  submit: [message: string]
}>()

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement>()

const autoResize = () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = textareaRef.value.scrollHeight + 'px'
  }
}

const handleSubmit = () => {
  if (input.value.trim() && !props.disabled) {
    emit('submit', input.value)
    input.value = ''
    // Reset textarea height
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
    }
  }
}
</script>
```

---

### Step 11: Create chat window component

Create `components/ChatWindow.vue`:

**Note:** Changed to full viewport height (calc(100vh - [header-height])) and made responsive.

```vue
<template>
  <div class="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-8rem)] glass rounded-card border border-brand-border overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-brand-border">
      <h2 class="text-white font-semibold">Chat</h2>
      <button
        @click="$emit('newChat')"
        class="text-white-65 hover:text-white text-sm transition"
      >
        New chat
      </button>
    </div>

    <!-- Messages -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto">
      <div v-if="messages.length === 0" class="h-full flex items-center justify-center">
        <p class="text-white-65">Start a conversation...</p>
      </div>
      <template v-else>
        <ChatMessage
          v-for="(message, index) in messages"
          :key="index"
          :message="message"
        />
      </template>

      <!-- Loading indicator -->
      <div v-if="isLoading" class="flex gap-4 p-4">
        <div class="glass border border-brand-border rounded-2xl rounded-bl-sm px-4 py-3">
          <div class="flex gap-1">
            <span class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
            <span class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
            <span class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="error" class="px-4 py-2 bg-red-500/20 border-t border-red-500/50">
      <p class="text-red-200 text-sm">{{ error }}</p>
    </div>

    <!-- Input -->
    <div class="p-4 border-t border-brand-border">
      <ChatInput
        :disabled="isLoading"
        @submit="$emit('send', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from '~/server/utils/llm/types'

const props = defineProps<{
  messages: Message[]
  isLoading: boolean
  error: string | null
}>()

defineEmits<{
  send: [message: string]
  newChat: []
}>()

const messagesContainer = ref<HTMLElement>()

// Auto-scroll to bottom when new messages arrive
watch(
  () => props.messages.length,
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  }
)
</script>
```

---

### Step 12: Update dashboard page

Update `pages/dashboard.vue` to include the chat interface:

**Note:** Dashboard is standalone with no global header integration.

```vue
<template>
  <div class="animate-fade-in-up">
    <!-- User info bar -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <p class="text-white-65 text-sm">Signed in as</p>
        <p class="text-white font-medium">{{ user?.email }}</p>
      </div>
      <button
        @click="handleSignOut"
        class="text-white-65 hover:text-white transition text-sm"
      >
        Sign out
      </button>
    </div>

    <!-- Chat interface -->
    <ChatWindow
      :messages="messages"
      :is-loading="isLoading"
      :error="error"
      @send="handleSend"
      @new-chat="handleNewChat"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { user, signOut } = useAuth()
const { messages, isLoading, error, sendMessage, startNewConversation } = useChat()

const handleSignOut = async () => {
  try {
    await signOut()
  } catch (error) {
    console.error('Sign out error:', error)
  }
}

const handleSend = (message: string) => {
  sendMessage(message)
}

const handleNewChat = () => {
  startNewConversation()
}
</script>
```

---

### Step 13: Test locally

```bash
npm run dev
```

Test the following:

1. **Log in** Ã¢â‚¬â€ Magic link flow from Phase 1.2
2. **Send a message** Ã¢â‚¬â€ Should see streaming response from Gemini
3. **Multiple messages** Ã¢â‚¬â€ Conversation context should be maintained
4. **New chat** Ã¢â‚¬â€ Should clear messages and start fresh
5. **Refresh page** Ã¢â‚¬â€ Conversation is lost (by design - no localStorage)
6. **Test conversation API endpoints** Ã¢â‚¬â€ Use browser dev tools or API client
   - GET `/api/conversations` - List all user conversations
   - POST `/api/conversations` - Create new conversation
   - GET `/api/conversations/[id]` - Load specific conversation with messages
7. **Error scenarios** Ã¢â‚¬â€ Verify errors display properly in UI

---

### Step 14: Update environment variables on Vercel

Add `GEMINI_API_KEY` to your Vercel project environment variables.

---

### Step 15: Commit and deploy

```bash
git add .
git commit -m "Add model router and chat interface with Gemini"
git push origin main
```

---

## Acceptance Criteria

- [ ] Gemini API key configured in environment
- [ ] Model router abstraction created with provider interface
- [ ] Chat API endpoint accepts messages and returns responses
- [ ] Streaming works Ã¢â‚¬â€ tokens appear incrementally
- [ ] Stream errors are properly communicated to client
- [ ] Messages persist to Supabase conversations/messages tables
- [ ] Chat UI displays user and assistant messages differently
- [ ] Chat UI uses full viewport height (responsive)
- [ ] Input is textarea with Enter to send
- [ ] Loading state shows while waiting for response
- [ ] Error states display appropriately
- [ ] "New chat" clears the conversation
- [ ] Conversation list API works (GET /api/conversations)
- [ ] Conversation creation API works (POST /api/conversations)
- [ ] Conversation retrieval API works (GET /api/conversations/[id])
- [ ] Works in both local development and production
- [ ] Failed messages appear as orphaned user messages (no assistant reply)

---

## GDPR Compliance: User Data Export

To comply with GDPR and allow users to export their data, run this SQL query in Supabase SQL Editor (replace `USER_EMAIL` with the actual user email):

```sql
-- Get user ID from email
WITH user_info AS (
  SELECT id FROM auth.users WHERE email = 'USER_EMAIL'
)
-- Export all conversations and messages for the user
SELECT
  c.id as conversation_id,
  c.title,
  c.model,
  c.created_at as conversation_created_at,
  c.updated_at as conversation_updated_at,
  m.id as message_id,
  m.role,
  m.content,
  m.created_at as message_created_at
FROM public.conversations c
LEFT JOIN public.messages m ON m.conversation_id = c.id
WHERE c.user_id = (SELECT id FROM user_info)
ORDER BY c.created_at DESC, m.created_at ASC;
```

Export this as JSON or CSV from the Supabase dashboard and provide to the user.

**Future consideration:** Add a UI button in the dashboard to trigger this export automatically via an API endpoint.

---

## Troubleshooting

### "Provider not configured" error
- Check `GEMINI_API_KEY` is set in `.env`
- Restart dev server after changing environment variables

### Streaming not working
- Check browser console for errors
- Verify the response headers include `text/event-stream`
- Some ad blockers interfere with SSE Ã¢â‚¬â€ try incognito

### Messages not saving to Supabase
- Check Supabase dashboard Ã¢â€ â€™ Table Editor Ã¢â€ â€™ messages
- Verify RLS policies are correct
- Check server logs for database errors

### "Unauthorized" errors
- Ensure you're logged in
- Check that the Supabase session is valid
- Try logging out and back in

### Orphaned user messages (failed messages)
- Check if there's a corresponding assistant message
- If user message exists without assistant reply, the LLM call failed
- Error should be displayed in the UI
- User messages are saved before LLM call, so failures leave orphaned messages

---

## Adding More Providers (Future)

To add Claude or OpenAI, create new provider files:

```typescript
// server/utils/llm/providers/claude.ts
export class ClaudeProvider implements LLMProvider {
  // Implement chat() and chatStream()
}

// server/utils/llm/providers/openai.ts
export class OpenAIProvider implements LLMProvider {
  // Implement chat() and chatStream()
}
```

Then register them in `router.ts`. The chat API and UI don't need to change Ã¢â‚¬â€ they work through the router abstraction.

---

## Next Phase Preview

**Program Structure (Phase 2)** will add:
- System prompts with Allen Carr methodology
- Personalization intake flow
- Session/day structure
- Progress tracking

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | [Original] | Initial Phase 1.3 specification created |
| 2.0 | 2026-01-11 | Changed terminology from "myths" to "illusions" where applicable; Added version control header |
| 3.0 | 2026-01-11 | Renamed from "Phase 1.3" to "Chat Infrastructure Specification" for feature-based organization; Added legacy reference for git commit traceability; Updated status to Complete; Updated cross-references to use hybrid naming |
