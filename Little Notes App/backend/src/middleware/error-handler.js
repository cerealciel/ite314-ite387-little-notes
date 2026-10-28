export function notFound(request, response) {
  response.status(404).json({ message: `Route not found: ${request.method} ${request.path}` });
}

export function errorHandler(error, _request, response, _next) {
  console.error('Request failed:', error.code || error.name || 'Error');
  if (response.headersSent) return;
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ message: 'Request body must contain valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return response.status(413).json({ message: 'Request body is too large.' });
  }
  response.status(500).json({ message: 'An unexpected server error occurred.' });
}
