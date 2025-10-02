// Strictly typed BroadcastChannel wrapper
export class TypedBroadcastChannel<T> {
  private channel: BroadcastChannel;

  constructor(name: string) {
    this.channel = new BroadcastChannel(name);
  }

  /** Post a message of type T */
  post(message: T): void {
    this.channel.postMessage(message);
  }

  /** Subscribe to messages */
  onMessage(callback: (message: T) => void): () => void {
    const handler = (event: MessageEvent) => {
      callback(event.data as T);
    };
    this.channel.addEventListener("message", handler);

    // Return unsubscribe function
    return () => this.channel.removeEventListener("message", handler);
  }

  /** Close the channel when you no longer need it */
  close(): void {
    this.channel.close();
  }
}
