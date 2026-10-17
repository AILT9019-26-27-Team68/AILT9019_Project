export function errorHandler(err, req, res, _next) {
  console.error("[error]", err.message);
  const status = err.response?.status || 500;
  res.status(status).json({
    error: "Request failed",
    detail: err.response?.data?.detail || err.message,
  });
}
