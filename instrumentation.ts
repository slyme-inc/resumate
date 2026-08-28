export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  // Never await this. A hung health check here would stall every cold start.
  void import("@/lib/db/health")
    .then(({ checkDbHealth }) => checkDbHealth())
    .then(() => {
      console.log("db connected");
    })
    .catch((error) => {
      console.error("db health check failed", error);
    });
}
