declare module 'mammoth' {
  interface MammothOptions {
    arrayBuffer: ArrayBuffer;
  }

  interface MammothMessage {
    type: string;
    message: string;
    path?: string[];
  }

  interface MammothResult {
    value: string;
    messages: MammothMessage[];
  }

  interface Mammoth {
    extractRawText: (options: MammothOptions) => Promise<MammothResult>;
  }

  const mammoth: Mammoth;
  export default mammoth;
} 
