import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, streamText } from 'ai'

export async function POST(req: Request) {
  const { messages, pdfContext } = await req.json()

  const systemPrompt = pdfContext
    ? `You are a helpful knitting pattern assistant. Answer questions using the pattern content below. Be concise and specific.\n\n--- PATTERN ---\n${pdfContext}\n--- END PATTERN ---`
    : 'You are a helpful knitting pattern assistant. No pattern has been uploaded yet.'

  const result = streamText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
