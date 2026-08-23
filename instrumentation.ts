export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  try {
    const { checkDbHealth } = await import("@/lib/db/health");
    await checkDbHealth();
    console.log("db connected");
  } catch (error) {
    console.error("db health check failed", error);
  }
}
