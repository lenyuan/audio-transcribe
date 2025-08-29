
import { type TranscriptSegment } from '../types';

const parseMMSS = (timestamp: string): number => {
  const parts = timestamp.split(':').map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return 0;
  let seconds = 0;
  if (parts.length === 3) { // HH:MM:SS
    seconds += parts[0] * 3600;
    seconds += parts[1] * 60;
    seconds += parts[2];
  } else { // MM:SS
    seconds += parts[0] * 60;
    seconds += parts[1];
  }
  return seconds;
};

const formatSrtTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  const milliseconds = (Math.round((totalSeconds % 1) * 1000)).toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds},${milliseconds}`;
};

export const generateSrtContent = (transcript: TranscriptSegment[]): string => {
  if (!transcript || transcript.length === 0) return '';

  return transcript.map((segment, index) => {
    const startTimeInSeconds = parseMMSS(segment.timestamp);
    
    let endTimeInSeconds;
    if (index < transcript.length - 1) {
      endTimeInSeconds = parseMMSS(transcript[index + 1].timestamp);
      // Add a fallback duration if the next timestamp is not after the current one
      if (endTimeInSeconds <= startTimeInSeconds) {
          endTimeInSeconds = startTimeInSeconds + 3; // Default 3-second duration
      }
    } else {
      // For the last segment, add a default duration
      endTimeInSeconds = startTimeInSeconds + 5; // Default 5-second duration
    }

    const srtStartTime = formatSrtTime(startTimeInSeconds);
    const srtEndTime = formatSrtTime(endTimeInSeconds);
    const text = `${segment.speaker}: ${segment.transcript}`;
    
    return `${index + 1}\n${srtStartTime} --> ${srtEndTime}\n${text}\n`;
  }).join('\n');
};