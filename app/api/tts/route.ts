import { NextRequest, NextResponse } from "next/server";

const GEMINI_TTS_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts:generateContent";

function pcmToWav(pcmBase64: string, sampleRate = 24000, channels = 1, bitsPerSample = 16): string {
  const pcm = Buffer.from(pcmBase64, "base64");
  const dataSize = pcm.length;
  const wav = Buffer.alloc(44 + dataSize);

  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE((sampleRate * channels * bitsPerSample) / 8, 28);
  wav.writeUInt16LE((channels * bitsPerSample) / 8, 32);
  wav.writeUInt16LE(bitsPerSample, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);
  pcm.copy(wav, 44);

  return wav.toString("base64");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const { text } = await req.json();

    const response = await fetch(`${GEMINI_TTS_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data?.error?.message || "TTS error" }, { status: response.status });
    }

    const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) {
      return NextResponse.json({ error: "No audio data returned" }, { status: 500 });
    }

    const { mimeType, data: audioBase64 } = inlineData;

    if (mimeType?.includes("pcm")) {
      return NextResponse.json({ audio: pcmToWav(audioBase64), mimeType: "audio/wav" });
    }

    return NextResponse.json({ audio: audioBase64, mimeType: mimeType || "audio/mp3" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
