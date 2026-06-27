export const logger = {
  info(message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[INFO] [${timestamp}] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    console.error(
      `[ERROR] [${timestamp}] ${message}`,
      error instanceof Error ? error.stack : JSON.stringify(error)
    );
  },
  request(method: string, url: string, status?: number) {
    const timestamp = new Date().toISOString();
    const statusText = status ? ` - Status: ${status}` : '';
    console.log(`[REQUEST] [${timestamp}] ${method} ${url}${statusText}`);
  },
};
