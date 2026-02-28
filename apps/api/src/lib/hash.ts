import { createHash } from 'node:crypto';

export function normalizeTranscript(transcript: string): string {
  return transcript.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function transcriptHash(transcript: string): string {
  const normalized = normalizeTranscript(transcript);
  return createHash('sha256').update(normalized).digest('hex');
}
