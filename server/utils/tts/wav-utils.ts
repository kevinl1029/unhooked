/**
 * WAV Audio Utilities
 *
 * Utilities for parsing WAV file headers and extracting audio information.
 */

/**
 * Get the actual duration of a WAV audio buffer in milliseconds.
 *
 * WAV header structure (44 bytes for standard PCM):
 * - Bytes 0-3: "RIFF"
 * - Bytes 4-7: File size - 8
 * - Bytes 8-11: "WAVE"
 * - Bytes 12-15: "fmt "
 * - Bytes 16-19: Format chunk size (16 for PCM)
 * - Bytes 20-21: Audio format (1 for PCM)
 * - Bytes 22-23: Number of channels
 * - Bytes 24-27: Sample rate
 * - Bytes 28-31: Byte rate (sample rate * channels * bits per sample / 8)
 * - Bytes 32-33: Block align (channels * bits per sample / 8)
 * - Bytes 34-35: Bits per sample
 * - Bytes 36-39: "data"
 * - Bytes 40-43: Data chunk size
 * - Bytes 44+: Audio data
 *
 * @param buffer - The WAV file as an ArrayBuffer
 * @returns Duration in milliseconds, or null if parsing fails
 */
export function getWavDurationMs(buffer: ArrayBuffer): number | null {
  try {
    const view = new DataView(buffer)

    // Verify RIFF header
    const riff = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    )
    if (riff !== 'RIFF') {
      console.warn('[wav-utils] Invalid WAV: missing RIFF header')
      return null
    }

    // Verify WAVE format
    const wave = String.fromCharCode(
      view.getUint8(8),
      view.getUint8(9),
      view.getUint8(10),
      view.getUint8(11)
    )
    if (wave !== 'WAVE') {
      console.warn('[wav-utils] Invalid WAV: missing WAVE format')
      return null
    }

    // Find the fmt chunk (may not be at fixed position in all WAV files)
    let offset = 12
    let byteRate = 0
    let dataSize = 0

    while (offset < buffer.byteLength - 8) {
      const chunkId = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      )
      const chunkSize = view.getUint32(offset + 4, true) // little-endian

      if (chunkId === 'fmt ') {
        // Found format chunk - byte rate is at offset + 8 + 8 (8 bytes into fmt data)
        byteRate = view.getUint32(offset + 8 + 8, true)
      } else if (chunkId === 'data') {
        // Found data chunk
        dataSize = chunkSize

        // Handle streaming WAV files where size is unknown (0xFFFFFFFF)
        // In this case, calculate actual data size from buffer
        if (dataSize === 0xFFFFFFFF || dataSize === 0) {
          // Data starts at offset + 8 (after chunk header), goes to end of buffer
          dataSize = buffer.byteLength - (offset + 8)
        }
        break // We have what we need
      }

      // Move to next chunk (chunk header is 8 bytes + chunk size)
      offset += 8 + chunkSize
    }

    if (byteRate === 0 || dataSize === 0) {
      console.warn('[wav-utils] Could not find fmt or data chunk')
      return null
    }

    // Duration = data size / byte rate (in seconds)
    const durationSeconds = dataSize / byteRate
    return Math.round(durationSeconds * 1000)
  } catch (err) {
    console.error('[wav-utils] Failed to parse WAV header:', err)
    return null
  }
}

/**
 * Scale word timings to match actual audio duration.
 *
 * When TTS providers return estimated timings (based on WPM calculations),
 * the actual audio duration may differ. This function scales all word
 * timings proportionally to fit the actual duration.
 *
 * @param wordTimings - Original word timings array
 * @param actualDurationMs - The actual audio duration
 * @returns Scaled word timings array
 */
export function scaleWordTimings(
  wordTimings: { word: string; startMs: number; endMs: number }[],
  actualDurationMs: number
): { word: string; startMs: number; endMs: number }[] {
  if (wordTimings.length === 0) {
    return wordTimings
  }

  // Use the last word's endMs as the estimated total span of word timings
  // This is more accurate than estimatedDurationMs which doesn't account
  // for word length adjustments and punctuation pauses
  const lastWordEndMs = wordTimings[wordTimings.length - 1].endMs
  if (lastWordEndMs === 0) {
    return wordTimings
  }

  const scaleFactor = actualDurationMs / lastWordEndMs

  return wordTimings.map(timing => ({
    word: timing.word,
    startMs: Math.round(timing.startMs * scaleFactor),
    endMs: Math.round(timing.endMs * scaleFactor)
  }))
}
