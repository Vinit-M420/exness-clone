import "hono";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    walletId: string;
    walletBalance: string;
  }
}

