import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { TypedBroadcastChannel } from "./broadcast";

describe("TypedBroadcastChannel", () => {
  beforeAll(() => {
    mockBroadcastChannel();
  });

  afterAll(() => {
    resetMockBroadcastChannel();
  });

  it("should post a message of type T", () => {
    // Arrange
    const channel = new TypedBroadcastChannel<string>("test-channel");
    const message = "hello world";

    let receivedMessage: string | null = null;
    channel.onMessage((message) => {
      receivedMessage = message;
    });

    // Act
    channel.post(message);

    // Assert
    expect(receivedMessage).toBe(message);
  });

  it("Should only receive messages from the same channel", () => {
    // Arrange
    const channel_1 = new TypedBroadcastChannel<string>("test-channel-1");
    const channel_2 = new TypedBroadcastChannel<string>("test-channel-2");
    const message = "hello world";

    let receivedMessage_1: string | null = null;
    channel_1.onMessage((message) => {
      receivedMessage_1 = message;
    });

    let receivedMessage_2: string | null = null;
    channel_2.onMessage((message) => {
      receivedMessage_2 = message;
    });

    // Act
    channel_1.post(message);

    // Assert
    expect(receivedMessage_1).toBe(message);
    expect(receivedMessage_2).toBe(null);
  });

  it("Should post a message of type T", () => {
    // Arrange
    type Message = {
      type: string;
      payload: string;
    };

    const channel = new TypedBroadcastChannel<Message>("test-channel");
    const message: Message = {
      type: "test",
      payload: "hello world",
    };

    let receivedPayload: string | null = null;

    channel.onMessage((message) => {
      receivedPayload = message.payload;
    });

    // Act
    channel.post(message);

    // Assert
    expect(receivedPayload).toEqual(message.payload);
  });
});

type BroadcastChannelMock = Omit<
  Record<keyof BroadcastChannel, Mock>,
  "name"
> & {
  name: string;
};

const mockChannels = new Map<string, BroadcastChannelMock>();

/**
 * Mocks the BroadcastChannel global by returning a mock function that
 * wraps the BroadcastChannel constructor.
 *
 * The mock function returns a mock BroadcastChannel object with the given
 * key and methods that are spies.
 */
export const mockBroadcastChannel = () => {
  vi.stubGlobal(
    "BroadcastChannel",
    vi.fn((key: string) => {
      const channel = mockChannels.get(key) ?? {
        name: key,
        dispatchEvent: vi.fn(),
        onmessage: vi.fn(),
        onmessageerror: vi.fn(),
        postMessage: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      channel.postMessage.mockImplementation((message: unknown) => {
        channel.addEventListener.mock.calls.forEach((call) => {
          if (call[0] !== "message") return;
          call[1]({ data: message });
        });
      });
      mockChannels.set(key, channel);
      return channel;
    }),
  );

  return mockChannels;
};

export const resetMockBroadcastChannel = () => {
  mockChannels.clear();
  vi.restoreAllMocks();
};
