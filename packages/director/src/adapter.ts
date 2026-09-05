import { fal } from "@fal-ai/client";

export interface DirectorConnection {
  send(prompt: string): void;
  close(): void;
}

export interface DirectorOptions {
  onResult?: (result: unknown) => void;
  onError?: (error: Error) => void;
}

export function connectDirector(options: DirectorOptions = {}): DirectorConnection | null {
  try {
    const connection = fal.realtime.connect("minimax/h3-max/director", {
      clientOnly: true,
      onResult: (result) => options.onResult?.(result),
      onError: (error) => options.onError?.(error instanceof Error ? error : new Error(String(error))),
    });
    return {
      send: (prompt: string) => connection.send({ prompt }),
      close: () => connection.close(),
    };
  } catch {
    return null;
  }
}
